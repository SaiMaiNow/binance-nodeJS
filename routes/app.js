const express = require("express");
const path = require('path');
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use('/wallet', require("./router/wallet.js"));
router.use('/cryptos', require("./router/cryptos"));
router.use('/order', require("./router/orders"));

module.exports = router;