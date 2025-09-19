const express = require('express');
const router = express.Router();

router.use('/users', require('./router/users.js'));
router.use('/wallet', require('./router/wallet.js'));
router.use('/cryptos', require('./router/cryptos.js'));
router.use('/order', require('./router/orders.js'));

module.exports = router;