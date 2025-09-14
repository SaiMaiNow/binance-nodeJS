const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Crypto = sequelize.define('crypto', {
    cryptoname: {
        type: DataTypes.STRING
    }
});

module.exports = Crypto;
