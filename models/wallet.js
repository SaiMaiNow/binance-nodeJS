const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Wallet = sequelize.define('wallet', {
    userid:{
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' },
        primaryKey: true,
        allowNull: false,
    },
    cryptoid:{
        type: DataTypes.INTEGER,
        references: { model: 'cryptos', key: 'id' },
        primaryKey: true,
        allowNull: false,
    },
    amount:{
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    price:{
        type: DataTypes.FLOAT,
        allowNull: false,
    }
}, {
    timestamps: false
});

module.exports = Wallet;
