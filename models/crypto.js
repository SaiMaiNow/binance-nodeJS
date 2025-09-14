const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Crypto = sequelize.define('crypto', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    cryptoname: {
        type: DataTypes.STRING
    }
});

module.exports = Crypto;
