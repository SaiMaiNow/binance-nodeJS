const dotenv = require('dotenv');
dotenv.config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
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