const express = require("express");
const dotenv = require('dotenv');
const { createPool } = require('./function/postgre');

dotenv.config();

const app = express();
const PORT = 8080;

app.use('/api', require('./routes/app'));

app.listen(PORT, () => {
  createPool(process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_HOST, process.env.DB_PORT, process.env.DB_NAME);
  console.log(`Server is running on port http://localhost:${PORT}/api/`);
});