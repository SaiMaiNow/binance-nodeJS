const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'postgres'
    }
);

async function connect() {
    try {
        await sequelize.authenticate();
        console.log('Connection successfully');
    } catch (error) {
        console.error('Database error:', error);
    }
}

async function sync() {
    try {
        await sequelize.sync();
        console.log('Connection synced successfully');
    } catch (error) {
        console.error('Unable to sync to the database:', error);
    }
}

module.exports = { sequelize, connect, sync };