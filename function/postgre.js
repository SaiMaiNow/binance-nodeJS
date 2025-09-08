import { Pool } from 'pg';

let pool;

function createPool(DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME) {
    pool = new Pool({
        user: DB_USER,
        host: DB_HOST,
        database: DB_NAME,
        password: DB_PASSWORD,
        port: DB_PORT,
    });

    console.log('Postgres Connected!!');
}

function getPool() {
    if (!pool) {
        return null;
    }

    return pool;
}

export { createPool, getPool };