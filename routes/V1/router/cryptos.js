const express = require('express');
const router = express.Router();
const cryptosService = require('../../../function/cryptos');
const { requireAuth } = require('../../../function/users');

// GET /api/cryptos
router.get('/', requireAuth, listSupported);

// GET /api/cryptos/all (ทุกเหรียญที่ขาย)
router.get('/all', requireAuth, getAllPrices);

// GET /api/cryptos/:symbol
router.get('/:symbol', requireAuth, getPrice);

// Logic Action API
async function listSupported(req, res) {
    try {
        const symbols = await cryptosService.getAllowedSymbols();
        return res.json({ success: true, data: symbols });
    } catch (err) {
        return res.status(500).json({ success: false, error: { code: 'READ_SYMBOLS_FAILED', message: err.message } });
    }
}

async function getPrice(req, res) {
    try {
        const symbol = String(req.params.symbol || '').toUpperCase();
        if (!symbol) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_SYMBOL', message: 'ต้องระบุ symbol' } });
        }
        const price = await cryptosService.getUsdPrice(symbol);

        // ตรวจสอบว่า price เป็น -1 หรือไม่ (symbol ไม่ถูกต้อง)
        if (price === -1) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'SYMBOL_NOT_ALLOWED',
                    message: 'ไม่มีซิมโบลนี้ในระบบ'
                }
            });
        }

        return res.json({ success: true, data: { symbol, pair: `${symbol}USDT`, priceUSD: price } });
    } catch (err) {
        return res.status(502).json({ success: false, error: { code: 'BINANCE_FETCH_ERROR', message: err.message } });
    }
}

async function getAllPrices(req, res) {
    try {
        const symbols = await cryptosService.getAllowedSymbols();
        if (!symbols || symbols.length === 0) {
            return res.json({ success: true, data: [] });
        }
        const results = await Promise.all(symbols.map(async (symbol) => {
            try {
                const priceUSD = await cryptosService.getUsdPrice(symbol);
                if (priceUSD === -1) {
                    return { symbol, pair: `${symbol}USDT`, error: 'ไม่มีซิมโบลนี้ในระบบ' };
                }
                return { symbol, pair: `${symbol}USDT`, priceUSD };
            } catch (e) {
                return { symbol, pair: `${symbol}USDT`, error: e.message };
            }
        }));
        return res.json({ success: true, data: results });
    } catch (err) {
        return res.status(502).json({ success: false, error: { code: 'BINANCE_FETCH_ERROR', message: err.message } });
    }
}

module.exports = router;