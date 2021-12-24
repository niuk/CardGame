import express from 'express';
import https from 'https';
import fs from 'fs/promises';
import WebSocket from 'ws';
import bodyParser from 'body-parser';

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
                const match = /\/(\d+)\/(\d+)/.exec(request.url);
                if (match !== null && match[1] !== undefined && match[2] !== undefined) {
                    new Player(ws, { gameId: match[1], playerIndex: parseInt(match[2]) });
                } else {
                    throw Error('bad request');
                }
            } else {
                new Player(ws);
            }
        } catch (e) {
            console.error(e);
        }
    });
    webSocketServer.on('close', (ws: WebSocket.Server) => {
        console.log(`closed websocket connection`);
    });

    const port = 443;
    console.log(`listening on port ${port}...`);
    httpsServer.listen(port);
})();