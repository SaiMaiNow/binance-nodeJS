const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Order = sequelize.define('order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userid: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    cryptoid: {
        type: DataTypes.INTEGER,
        references: { model: 'crypto', key: 'id' }
    },
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
