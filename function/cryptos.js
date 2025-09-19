// ใช้ fetch แทน https module
const Crypto = require('../models/crypto');


// in-memory cache แบบง่าย: key = pairSymbol (เช่น BTCUSDT)
// value = { price: number, ts: epoch_ms }
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 วินาที


async function readAllowedSymbolsFromDB() {
    const rows = await Crypto.findAll({
        attributes: ['cryptoname'],
        order: [['id', 'ASC']]
    });
    return rows.map(r => String(r.cryptoname).toUpperCase());
}

async function assertSymbolAllowed(symbol) {
    const list = await readAllowedSymbolsFromDB();
    const up = String(symbol).toUpperCase();
    if (!list.includes(up)) {
        return null; // return null แทน throw error
    }
    return up;
}

async function fetchBinancePriceUSD(pairSymbol) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pairSymbol}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data?.price) {
            return Number(data.price);
        } else {
            throw new Error('Invalid response from Binance');
        }
    } catch (error) {
        throw error;
    }
}

async function getUsdPrice(symbol) {
    const up = await assertSymbolAllowed(symbol);
    if (!up) {
        return -1; // return -1 ถ้า symbol ไม่ถูกต้อง
    }
    const pair = `${up}USDT`;
    const now = Date.now();
    const c = cache.get(pair);
    if (c && (now - c.ts) < CACHE_TTL_MS) {
        return c.price;
    }
    const price = await fetchBinancePriceUSD(pair);
    cache.set(pair, { price, ts: now });
    return price;
}


async function getAllowedSymbols() {
    return await readAllowedSymbolsFromDB();
}

module.exports = { getUsdPrice, getAllowedSymbols };