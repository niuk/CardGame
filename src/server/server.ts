import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import heapdump from 'heapdump';

import * as Lib from '../lib.js';
import Game from './game.js';
import Player from './player.js';

const HEAPDUMP_DIR = 'heapdumps';
const CLIENTLOGS_DIR = 'clientLogs';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

(async () => {
    await fs.mkdir(HEAPDUMP_DIR, { recursive: true });

    while (true) {
        await Lib.delay(5 * MS_PER_MINUTE);

	//heapdump.writeSnapshot(path.join(HEAPDUMP_DIR, `${new Date().toISOString()}.heapsnapshot`));
    }
})().catch(e => console.error(e));

async function foreachSavedGame(cb: (path: string) => Promise<void>): Promise<void> {
    await fs.mkdir(Game.SAVEDIR, { recursive: true });

    const gamesDir = await fs.opendir(Game.SAVEDIR);
    try {
        while (true) {
            const gameFile = await gamesDir.read();
            if (gameFile === null) {
                break;
            }

            if (gameFile.isFile()) {
                await cb(path.join(Game.SAVEDIR, gameFile.name));
            }
        }
    } finally {
        await gamesDir.close();
    }
}

let pruned = false;

(async () => {
    while (true) {
        // every hour, prune saved games that are older than a day
        await foreachSavedGame(async path => {
            if (Date.now() - (await fs.lstat(path)).mtimeMs > 24 * MS_PER_HOUR) {
                console.log(`deleting game: ${path}`);
                fs.rm(path);
            } else {
                console.log(`game is too recent to be deleted: ${path}`);
            }
        });

        pruned = true;

        await Lib.delay(1 * MS_PER_HOUR);
    }
})();

// wait so that we don't restore stale games
// since each game almost immediately persists itself,
// doing so would bump their modification timestamps
while (!pruned) {
    await Lib.delay(1 * MS_PER_SECOND);
}

// now we can restore saved games
await foreachSavedGame(async path => {
    const gameFileContent = (await fs.readFile(path)).toString();
    console.log(`restoring game: ${gameFileContent}`);
    try {
        new Game(JSON.parse(gameFileContent));
        console.log(`restored game: ${path}`);
    } catch (e) {
        console.warn(`failed to restore game: ${path}, deleting it instead. Error:`, e);
        await fs.rm(path);
    }
});

const app = express();

app.use(express.static('www'));

app.use(bodyParser.json());

app.get('/', async (_, response) => {
    response.contentType('text/html').send(await fs.readFile('www/index.html'));
});

app.post('/clientLogs', async (request, response) => {
    const f = await fs.open(path.join(CLIENTLOGS_DIR, `${
        new Date().toLocaleString()
            .replace(/ /g, '')
            .replace(/\//g, '-')
            .replace(/:/g, '-')
            .replace(/,/g, '_')
        }.log`),
        'w'
    );

    try {
        const s = f.createWriteStream();
        try {
            for (const entry of request.body as string[][]) {
                for (const line of entry) {
                    s.write(JSON.stringify(line));
                    s.write('\n');
                }
            }

            console.log('client logs saved');

            response.contentType('application/json').send({
                clientLogs: request.body.length
            });
        } finally {
            s.end();
        }
    } finally {
        f.close();
    }
});

app.get('/serverLogs/:gameId', async (request, response) => {
    try {
        const logFile = await fs.open(path.join('games', `${request.params.gameId}.log`), 'r');
        try {
            response.contentType('text/plain').send(logFile.readFile());
        } finally {
            await logFile.close();
        }
    } catch (e) {
        console.error(e);
    }
});

// start receiving connections
const [httpsServer, port] = await ((async () => {
    try {
        return [
            https.createServer({
                key: await fs.readFile('../key.pem'),
                cert: await fs.readFile('../cert.pem'),
            }, app),
            443
        ];
    } catch (e) {
        console.error(e);
        console.log('HTTP server creation failed. Creating HTTP server...');
        return [
            http.createServer(app),
            8080
        ];
    }
})());

const webSocketServer = new WebSocket.Server({ server: httpsServer });

webSocketServer.on('connection', (ws, request) => {
    try {
        console.log(`new websocket connection; url = ${request.url}`);
        if (request.url !== undefined && request.url !== '//') {
            const match = /\/(\d+)\/(.*)/.exec(request.url);
            if (match !== null && match[1] !== undefined && match[2] !== undefined) {
                new Player(decodeURI(match[2]), ws, match[1]);
            } else {
                throw Error(`bad request: ${request.url}`);
            }
        } else {
            new Player('', ws);
        }
    } catch (e) {
        console.error(e);
    }
});

webSocketServer.on('close', (ws: WebSocket.Server) => {
    console.log(`closed websocket connection`);
});

(async () => {
    while (true) {
        // every 5 minutes, destroy games that have had no active players for 5 minutes
        await Lib.delay(15 * MS_PER_MINUTE);

        console.log('pruning games with no active players...');
        const gamesToRemove: Game[] = [];
        for (const game of Game.gamesById.values()) {
            if (Date.now() - game.heartbeat >= 15 * MS_PER_MINUTE) {
                console.log(`destroying game: ${game.gameId}`);
                gamesToRemove.push(game);
            }
        }

        for (const gameToRemove of gamesToRemove) {
            Game.gamesById.delete(gameToRemove.gameId);
        }
    }
})();

console.log(`listening on port ${port}...`);
httpsServer.listen(port);
