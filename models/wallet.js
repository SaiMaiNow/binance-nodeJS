const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Wallet = sequelize.define('wallet', {
    amount:{
        type: DataTypes.FLOAT
    },
    price:{
        type: DataTypes.FLOAT
    }
});

module.exports = Wallet;
