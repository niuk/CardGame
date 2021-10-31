import express from 'express';
import https from 'https';
import fs from 'fs/promises';
import WebSocket from 'ws';

import Player from './player.js';

const app = express();

app.use(express.static('www'));

app.get('/', async (_, response) => {
    response.contentType('text/html').send(await fs.readFile('www/index.html'));
});

(async () => {
    const httpsServer = https.createServer({
        key: await fs.readFile('../key.pem'),
        cert: await fs.readFile('../cert.pem'),
    }, app);

    const webSocketServer = new WebSocket.Server({ server: httpsServer });
    webSocketServer.on('connection', (ws, request) => {
        console.log(`new websocket connection; url = ${request.url}`);
        if (request.url && request.url !== '/') {
            const match = /\/(\d+)\/(\d+)/.exec(request.url);
            if (match && match[1] && match[2]) {
                new Player(ws, { gameId: match[1], playerIndex: parseInt(match[2]) });
            } else {
                throw Error();
            }
        } else {
            new Player(ws);
        }
    });
    webSocketServer.on('close', (ws: WebSocket.Server) => {
        console.log(`closed websocket connection`);
    });

    const port = 443;
    console.log(`listening on port ${port}...`);
    httpsServer.listen(port);
})();