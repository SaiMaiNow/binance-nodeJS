const express = require("express");
const { connect, sync } = require('./function/postgre');

const app = express();
const PORT = 8080;

app.use('/api', require('./routes/app'));

app.listen(PORT, async () => {
  await connect();
  await sync();
  console.log(`Server is running on port ${PORT}`);
});