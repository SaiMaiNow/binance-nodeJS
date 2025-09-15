const express = require("express");
const path = require('path');
const router = express.Router();


router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use(require("./router/wallet"));
router.use('/cryptos', require("./router/cryptos"));
router.use('/Order', require('./Order.routes'));

module.exports = router;