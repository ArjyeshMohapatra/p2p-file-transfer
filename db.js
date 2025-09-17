import pg from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testConnection() {
    try {
        const client = await pool.connect();
        logger.info('✅ Successfully connected to the PostgreSQL database!');
        client.release();
    } catch (error) {
        logger.error('❌ Error connecting to the PostgreSQL database : ', error);
    }
}
testConnection();
export default pool;