import express from 'express';
import https from 'https';
import fs from 'fs/promises';
import WebSocket from 'ws';

import Player from './player.js';

const app = express();

app.use(express.static('static'));

app.get('/', async (_, response) => {
    response.contentType('text/html').send(await fs.readFile('static/client.html'));
});

(async () => {
    const httpsServer = https.createServer({
        key: await fs.readFile('../key.pem'),
        cert: await fs.readFile('../cert.pem'),
    }, app);

    const webSocketServer = new WebSocket.Server({ server: httpsServer });
    webSocketServer.on('connection', ws => {
        console.log(`new websocket connection`);
        new Player(ws);
    });

    const port = 443;
    console.log(`listening on port ${port}...`);
    httpsServer.listen(port);
})();