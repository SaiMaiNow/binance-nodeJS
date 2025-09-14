const express = require("express");
const session = require('express-session');

const dotenv = require('dotenv');
const { connect, sync } = require('./function/postgre');

dotenv.config();

const app = express();
const PORT = 8080;

app.use(express.json());

app.use(session({
  secret: 'FC3XSZYnBW',
  resave: false,
  saveUninitialized: true,
}));

app.use('/api', require('./routes/app'));

app.listen(PORT, async () => {
  await connect();
  await sync();
  console.log(`Server is running on port ${PORT}`);
});