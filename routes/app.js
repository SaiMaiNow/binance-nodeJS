const express = require("express");
const path = require('path');
const router = express.Router();
const wallet = require("./router/wallet.js");

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use('/wallet', wallet.router);
router.use('/cryptos', require("./router/cryptos"));
router.use('/Order', require('./Order.routes'));

module.exports = router;