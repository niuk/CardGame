import express from 'express';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import WebSocket from 'ws';
import bodyParser from 'body-parser';

import Game from './game.js';
import Player from './player.js';

const app = express();

app.use(express.static('www'));

app.use(bodyParser.json());

app.get('/', async (_, response) => {
    response.contentType('text/html').send(await fs.readFile('www/index.html'));
});

app.post('/clientLogs', async (request, response) => {
    const f = await fs.open(`./${
        new Date().toLocaleString()
            .replace(/ /g, '')
            .replace(/\//g, '-')
            .replace(/:/g, '-')
            .replace(/,/g, '_')
        }.log`,
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

(async () => {
    const httpsServer = https.createServer({
        key: await fs.readFile('../key.pem'),
        cert: await fs.readFile('../cert.pem'),
    }, app);

    const webSocketServer = new WebSocket.Server({ server: httpsServer });

    webSocketServer.on('connection', (ws, request) => {
        try {
            console.log(`new websocket connection; url = ${request.url}`);
            if (request.url !== undefined && request.url !== '//') {
                const match = /\/(\d+)\/(.*)/.exec(request.url);
                if (match !== null && match[1] !== undefined && match[2] !== undefined) {
                    new Player(match[2], ws, match[1]);
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

    // restore saved games
    const gamesDir = await fs.opendir(Game.SAVEDIR);
    try {
        while (true) {
            const gameFile = await gamesDir.read();
            if (gameFile === null) {
                break;
            }

            if (gameFile.isFile()) {
                const gameFileContent = (await fs.readFile(path.join(Game.SAVEDIR, gameFile.name))).toString();
                console.log(`restoring game: ${gameFileContent}`);
                new Game(JSON.parse(gameFileContent));
            }
        }
    } finally {
        await gamesDir.close();
    }

    const port = 443;
    console.log(`listening on port ${port}...`);
    httpsServer.listen(port);
})();