const express = require('express');
const router = express.Router();
const cryptosService = require('../services/cryptos.service');


// COIN Name :  BTC, ETH, BNB, SOL, XRP, ADA, DOGE, TON, TRX, LTC, SHIB
// GET /api/cryptos
router.get('/', listSupported);

// GET /api/cryptos/:symbol/price
router.get('/:symbol/price', getPrice);

// GET /api/cryptos/prices?symbols=BTC,ETH,SOL
router.get('/prices/batch', getPrices);


// Logic Action API
async function listSupported(req, res) {
    return res.json({ success: true, data: [], message: 'รองรับทุกเหรียญที่ Binance มี - ใช้ /:symbol/price เพื่อดูราคา' });
}

async function getPrice(req, res) {
    try {
        const symbol = String(req.params.symbol || '').toUpperCase();
        if (!symbol) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_SYMBOL', message: 'ต้องระบุ symbol' } });
        }
        const price = await cryptosService.getUsdPrice(symbol);
        return res.json({ success: true, data: { symbol, pair: `${symbol}USDT`, priceUSD: price } });
    } catch (err) {
        return res.status(502).json({ success: false, error: { code: 'BINANCE_FETCH_ERROR', message: err.message } });
    }
}

async function getPrices(req, res) {
    try {
        const { symbols } = req.query; // เช่น symbols=BTC,ETH,SOL
        if (!symbols) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_SYMBOLS', message: 'ต้องระบุ symbols ใน query parameter' } });
        }
        const list = String(symbols).split(',').map(s => s.trim()).filter(Boolean);
        if (list.length === 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_SYMBOLS', message: 'ต้องระบุ symbols อย่างน้อย 1 ตัว' } });
        }
        const data = await cryptosService.getUsdPrices(list);
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(502).json({ success: false, error: { code: 'BINANCE_FETCH_ERROR', message: err.message } });
    }
}

module.exports = router;