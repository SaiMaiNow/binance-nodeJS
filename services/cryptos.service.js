const https = require('https');

// ไม่จำกัดเหรียญ - รองรับทุกเหรียญที่ Binance มี

// in-memory cache แบบง่าย: key = pairSymbol (เช่น BTCUSDT)
// value = { price: number, ts: epoch_ms }
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 วินาที


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
    const pair = `${String(symbol).toUpperCase()}USDT`;
    const now = Date.now();
    const c = cache.get(pair);
    if (c && (now - c.ts) < CACHE_TTL_MS) {
        return c.price;
    }
    const price = await fetchBinancePriceUSD(pair);
    cache.set(pair, { price, ts: now });
    return price;
}

async function getUsdPrices(symbols) {
    if (!symbols || !symbols.length) {
        throw new Error('ต้องระบุ symbols อย่างน้อย 1 ตัว');
    }
    const list = symbols.map(s => String(s).toUpperCase());
    const results = await Promise.all(list.map(async (sym) => {
        try {
            const price = await getUsdPrice(sym);
            return { symbol: sym, pair: `${sym}USDT`, priceUSD: price };
        } catch (e) {
            return { symbol: sym, pair: `${sym}USDT`, error: e.message };
        }
    }));
    return results;
}

module.exports = { getUsdPrice, getUsdPrices };