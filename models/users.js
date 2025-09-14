const { DataTypes } = require('sequelize');

const { sequelize } = require('../function/postgre');

const Users = sequelize.define('users', {
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
        type: DataTypes.FLOAT
    },
    createdAt:{
        type: DataTypes.DATE
    }
});

module.exports = Users;