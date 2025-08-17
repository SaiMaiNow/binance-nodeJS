const express = require("express");
const app = express();
const PORT = 8080;

app.use('/api', require('./routes/app'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});