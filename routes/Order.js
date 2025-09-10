const express = require('express');
const router = express.Router();
const Apibinance = require('./cryptos.routes.js');

// COIN Name :  BTC, ETH, BNB, SOL, XRP, ADA, DOGE, TON, TRX, LTC, SHIB
// GET /api/Order

router.get('/', Apibinance.listSupported);

