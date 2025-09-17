import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import logger from './logger.js'; // looks for logger.js inside current directory
import rateLimit from 'express-rate-limit';
import { param, validationResult } from 'express-validator';
import compression from 'compression';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 10 minutes
    max: 100, // limits each IP to 20 requests per window
    standardHeaders: true, // returns rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // disables the `X-RateLimit-*` headers
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // creates an express application

const PORT = process.env.PORT || 9000; // defines port number where above express app will run
app.use(cors());
app.use(limiter);
app.use(compression());

// below server is needed because PeerJS mediator requires a http server to run
const server = http.createServer(app); // wraps the express app into a http server

// ExpressPeerServer is used to create a PeerJS signaling server
// path : '/myapp' defines the path under which PeerJS will run i.e. 'peerjs/myapp'
const peerServer = ExpressPeerServer(server, { debug: true, path: '/myapp' });

peerServer.on('disconnect', async (client) => { // listens when a peer gets disconnected
    const peerId = client.getId(); // retrives peer's ID
    try {
        await pool.query('DELETE from active_ids where peer_id = $1', [peerId]);
        logger.info(`Peer ${peerId} disconnected. ID removed from database.`);
    } catch (error) {
        logger.error(`Failed to delete Peer ID ${peerId} from database:`, error);
    }
});

// attaches peerServer mediator with express application
app.use('/peerjs', peerServer);

app.use(express.static(path.join(__dirname, 'public')));

// creates a new API endpoint http://peerjs/myapp/generate-id
app.get('/generate-id', async (request, response) => {
    let newId;
    let isUnique = false;
    try {
        // keeps trying until a unique ID is found
        while (!isUnique) {
            newId = Math.floor(100000 + Math.random() * 900000).toString();
            try {
                // an attempt to insert new ID. if duplicate is found then PRIMARY KEY will arise error
                await pool.query('INSERT INTO active_ids (peer_id) VALUES ($1)', [newId]);
                isUnique = true; // if no error returned then insert was sucessful and ID was unique
            } catch (error) {
                // if its a duplicate error while loop continues to generate until ID becomes unique
                if (error.code !== '23505') throw error;
            }
        }
        logger.info(`Generated and stored new unique ID: ${newId}.`);
        response.json({ id: newId });
    } catch (error) {
        logger.error('Failed to generate a unique ID:', error);
        response.status(500).json({ error: 'Could not generate an ID.' });
    }
});

// creates a new API endpoint http://peerjs/myapp/check-id/123456
app.get('/check-id/:id', param('id').isLength({ min: 6, max: 6 }).isNumeric(), async (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) return response.status(400).json({ errors: errors.array() });

    const { id } = request.params; // gets peerid provided by reciver
    try {
        const { rows } = await pool.query('SELECT peer_id FROM active_ids WHERE peer_id = $1', [id]);
        const idExists = rows.length > 0;
        logger.info(`Checking ID: ${id}. Exists: ${idExists}`);
        response.json({ idExists });
    } catch (error) {
        logger.error(`Failed to check ID ${id}:`, error);
        response.status(500).json({ error: 'Could not check ID.' });
    }
});

// default root endpoint
app.get('/', (reqest, response) => {
    response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// endpoint to handle health of server.js and database
app.get('/health', async (request, response) => {
    try {
        await pool.query('SELECT 1');
        logger.info(`Ping received at ${new Date().toLocaleTimeString()}`);
        response.status(200).send('Hey, I`m alive.');
    } catch (error) {
        logger.error('Health check failed:', error);
        // 503 Service Unavailable is the standard code for a failed health check
        response.status(503).send('Service Unavailable');
    }
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

server.listen(PORT, '0.0.0.0', () => {
    logger.info(`PeerJS server is running on port ${PORT}`);
});