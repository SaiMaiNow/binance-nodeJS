const express = require('express');
const router = express.Router();
const walletController = require('../../function/wallet.js');

router.post('/users/:id/wallet', walletController.addWallet);
router.get('/users/:id/wallet', walletController.getWallet);
router.put('/users/:id/wallet', walletController.updateWallet);
router.delete('/users/:id/wallet', walletController.deleteWallet);

module.exports = router;
