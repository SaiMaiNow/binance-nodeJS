const https = require('https');
const Crypto = require('../models/crypto');

// จำกัดให้ใช้ได้แค่ 10 เหรียญเท่านั้น
const ALLOWED_SYMBOLS_10 = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP',
    'ADA', 'DOGE', 'TON', 'TRX', 'LTC'
];

// in-memory cache แบบง่าย: key = pairSymbol (เช่น BTCUSDT)
// value = { price: number, ts: epoch_ms }
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 วินาที

async function seedAllowedSymbolsIfNeeded() {
    // ใช้ findOrCreate เพื่อหลีกเลี่ยง duplicate โดยไม่ต้องพึ่ง unique index
    for (const sym of ALLOWED_SYMBOLS_10) {
        await Crypto.findOrCreate({
            where: { cryptoname: sym },
            defaults: { cryptoname: sym }
        });
    }
}

async function readAllowedSymbolsFromDB() {
    await seedAllowedSymbolsIfNeeded();
    const rows = await Crypto.findAll({
        attributes: ['cryptoname'],
        order: [['id', 'ASC']],
        limit: 10
    });
    return rows.map(r => String(r.cryptoname).toUpperCase());
}

async function assertSymbolAllowed(symbol) {
    const list = await readAllowedSymbolsFromDB();
    const up = String(symbol).toUpperCase();
    if (!list.includes(up)) {
        const allowed = list.join(',');
        const err = new Error(`รองรับเฉพาะ 10 เหรียญเท่านั้น: ${allowed}`);
        err.code = 'SYMBOL_NOT_ALLOWED';
        throw err;
    }
    return up;
}

function fetchBinancePriceUSD(pairSymbol) {
    return new Promise((resolve, reject) => {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pairSymbol}`;
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed?.price) {
                        resolve(Number(parsed.price));
                    } else {
                        reject(new Error('Invalid response from Binance'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function getUsdPrice(symbol) {
    const up = await assertSymbolAllowed(symbol);
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