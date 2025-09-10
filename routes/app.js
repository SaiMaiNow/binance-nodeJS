const express = require("express");
const path = require('path');
const router = express.Router();


router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use('/cryptos', require('./cryptos.routes'));

module.exports = router;