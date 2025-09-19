const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Crypto = sequelize.define('cryptos', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    cryptoname: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false
});

module.exports = Crypto;
