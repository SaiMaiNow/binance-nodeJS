const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Users = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING
    },
    lastName: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    tel:{
        type: DataTypes.STRING
    },
    birthDate:{
        type: DataTypes.DATE
    },
    money:{
        type: DataTypes.FLOAT,
        defaultValue: 0 
    },
    createdAt:{
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

module.exports = Users;
