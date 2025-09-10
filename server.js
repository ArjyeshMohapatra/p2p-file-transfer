import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js'; // looks for logger.js inside current directory

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // creates an express application

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": [
                    "'self'",
                    "https://unpkg.com",
                    "'sha256-AeG/X32nTUd51hnCpCvD37nRJXsIWABQY9scDHjNlgQ='",
                    "'sha256-DaTaLfQUfrzmkns/tPRevxKzJs6jN1vu6wKmGi6+1DQ='"
                ],
            },
        },
    })
);

const PORT = process.env.PORT || 9000; // defines port number where above express app will run
app.use(cors());

const activeIDs = new Set(); // will holds the 6 digit PeerId which are currently in use

// below server is needed because PeerJS mediator requires a http server to run
const server = http.createServer(app); // wraps the express app into a http server

// ExpressPeerServer is used to create a PeerJS signaling server
// path : '/myapp' defines the path under which PeerJS will run i.e. 'peerjs/myapp'
const peerServer = ExpressPeerServer(server, { debug: true, path: '/myapp' });

peerServer.on('disconnect', (client) => { // listens when a peer gets disconnected
    const peerId = client.getId(); // retrives peer's ID
    if (activeIDs.has(peerId)) { // checks if a peerId exists or not
        activeIDs.delete(peerId); // if id exists within activeIDs then remove it and make it free for use
        logger.info(`Peer ${peerId} disconnected. ID is now available.`);
    }
});

// attaches peerServer mediator with express application
app.use('/peerjs', peerServer);

app.use(express.static(path.join(__dirname, 'public')));

// creates a new API endpoint http://peerjs/myapp/generate-id
app.get('/generate-id', (request, response) => {
    let newId;
    do {
        newId = Math.floor(100000 + Math.random() * 900000).toString();
    } while (activeIDs.has(newId)); // keeps generating new IDs until it finds one not in activeIDs
    activeIDs.add(newId); // stores the newId as in use
    logger.info(`Generated new unique ID: ${newId}. Total active IDs: ${activeIDs.size}`);
    response.json({ id: newId });
});

// creates a new API endpoint http://peerjs/myapp/check-id/123456
app.get('/check-id/:id', (request, response) => {
    const { id } = request.params; // gets peerid provided by reciver
    const idExists = activeIDs.has(id); // checks if provided id exists in activeIDs
    logger.info(`Checking ID: ${id}. Exists: ${idExists}`);
    response.json({ idExists: idExists });
});

// default root endpoint
app.get('/', (reqest, response) => {
    response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// endpoint to handle keep-alive pings
app.get('/ping', (request, response) => {
    logger.info(`Ping received at ${new Date().toLocaleTimeString()}`);
    response.status(200).send('Hey, I`m alive.');
});

app.use((error, request, response, next) => {
    logger.error(error.stack);
    response.status(500).json({ error: "Something went wrong on our end!" });
});

process.on('SIGTERM', waitBeforeShutdown);
process.on('SIGINT', waitBeforeShutdown);

function waitBeforeShutdown() {
    logger.info('Shutdown signal received, closing server gracefully.');

    server.close(() => {
        logger.info('All connections closed. Exiting process.');
        process.exit(0);
    });
}

server.listen(PORT, () => {
    logger.info(`PeerJS server is running on port ${PORT}`);
});