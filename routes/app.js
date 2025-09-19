const express = require("express");
const path = require('path');
const router = express.Router();

router.use("/users", require('./router/users'));

router.use('/wallet', require("./router/wallet.js"));
router.use('/cryptos', require("./router/cryptos"));
router.use('/order', require("./router/orders"));

module.exports = router;