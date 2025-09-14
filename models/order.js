const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Order = sequelize.define('order', {
    amount: {
        type: DataTypes.FLOAT
    },
    price: {
        type: DataTypes.FLOAT
    },
    type: {
        type: DataTypes.STRING
    }
});

module.exports = Order;
