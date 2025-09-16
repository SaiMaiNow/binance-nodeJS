const express = require('express');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../../function/postgre');
const Order = require('../../models/order');

const router = express.Router();

// Simple JSONL logger to logs/orders/*.jsonl
function appendOrderLog(entry, filename = 'all') {
    try {
        const dir = path.join(__dirname, '../../logs/orders');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${filename}.jsonl`);
        fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
    } catch (e) {
        // swallow log errors to not impact API flow
    }
}

// State for scheduled matching
let pendingMatch = false;
let isMatching = false;

// API
// GET /api/order -> list all orders
/*
--- เราดึงออเดอร์ของทั้ง : BUY / SELL     มาทุกการเทรด , ทุกเหรียญที่มีคำสั่งซื้อขาย 
*/
router.get('/', async (req, res) => {
    try {
        const orders = await Order.findAll();
        res.json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_LIST_FAILED', message: err.message } });
    }
});

// GET /api/order/book?cryptoid=1 -> order book by symbol/cryptoid
/*
--- คือเราดึงข้อมูลการซื้อขายมาทั้ง 2 ฝั่งคือ :  BUY / SELL        !! แต่เฉพาะเหรียญที่เราเรียกนะ ตาม id ของเหรียญนั้นๆ (เช่น  BTC : _id:1_ )
*/
router.get('/book', async (req, res) => {
    try {
        const where = {};
        if (req.query.cryptoid) where.cryptoid = Number(req.query.cryptoid);
        const all = await Order.findAll({ where });
        const buys = all.filter(o => String(o.type).toUpperCase() === 'BUY')
            .sort((a, b) => (b.price - a.price) || (a.id - b.id));
        const sells = all.filter(o => String(o.type).toUpperCase() === 'SELL')
            .sort((a, b) => (a.price - b.price) || (a.id - b.id));
        res.json({ success: true, data: { buys, sells } });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_BOOK_FAILED', message: err.message } });
    }
});

// POST /api/order -> create new order
/* 
--- ( ผู้ใช้งานคนที่ 1 : User ID : 1  --->  "BUY") ---
{
    "userid": 1,
    "cryptoid": 1,
    "amount": 0.5,
    "price": 60000,
    "type": "BUY"
}

--- ( ผู้ใช้งานคนที่ 2 : User ID : 2  --->  "SELL") ---

{
  "userid": 2,
  "cryptoid": 1,
  "amount": 0.3,
  "price": 59900,
  "type": "SELL"
}
*/
router.post('/', async (req, res) => {
    try {
        const { userid, cryptoid, amount, price, type } = req.body || {};
        if (!userid || !cryptoid || !amount || !price || !type) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'ต้องมี userid, cryptoid, amount, price, type' } });
        }
        const upType = String(type).toUpperCase();
        if (!['BUY', 'SELL'].includes(upType)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'type ต้องเป็น BUY หรือ SELL' } });
        }

        const created = await Order.create({ userid, cryptoid, amount, price, type: upType });
        appendOrderLog({ event: 'CREATE', order: created.toJSON() });

        // schedule matching
        pendingMatch = true;
        res.status(201).json({ success: true, data: created });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_CREATE_FAILED', message: err.message } });
    }
});

// PUT /api/order/:id -> update amount/price/type
/* 
--- แก้ไขออเดอร์อะไรได้บ้าง  :  { amount, price, type, userid, cryptoid }  --- 

>> ตามไอดีที่เรารู้ว่า แมตกับอะไร  && ค่าอะไรที่เราต้องการจะเปลี่ยน

*/
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const payload = {};
        const allowed = ['userid', 'cryptoid', 'amount', 'price', 'type'];
        for (const k of allowed) {
            if (req.body.hasOwnProperty(k)) payload[k] = req.body[k];
        }
        if (payload.type) payload.type = String(payload.type).toUpperCase();
        const [count] = await Order.update(payload, { where: { id } });
        if (count === 0) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบออเดอร์' } });
        const updated = await Order.findByPk(id);
        appendOrderLog({ event: 'UPDATE', order: updated.toJSON() });
        pendingMatch = true;
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_UPDATE_FAILED', message: err.message } });
    }
});

// DELETE /api/order/:id -> cancel order
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const found = await Order.findByPk(id);
        if (!found) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบออเดอร์' } });
        await Order.destroy({ where: { id } });
        appendOrderLog({ event: 'CANCEL', order: found.toJSON() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_DELETE_FAILED', message: err.message } });
    }
});

// POST /api/order/match -> trigger matching immediately
router.post('/match', async (req, res) => {
    try {
        pendingMatch = true;
        // run in background; respond fast
        triggerMatchSoon();
        res.json({ success: true, message: 'matching scheduled' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'MATCH_TRIGGER_FAILED', message: err.message } });
    }
});

// Matching core logic
/*
---  : อธิบายการทำงาน :  ---
1. ทุก ๆ 7 วินาที ถ้ามีธง pendingMatch=true จะเริ่มทำงาน
2. ดึงออเดอร์ทั้งหมดจากฐานข้อมูล “ครั้งเดียว” แล้วแยกตาม cryptoid (ตลาด)
3. ในแต่ละตลาด จัดเรียง:
        >  BUY: ราคา สูง→ต่ำ แล้วตามด้วยเวลาเข้าก่อน
        >  SELL: ราคา ต่ำ→สูง แล้วตามด้วยเวลาเข้าก่อน
4. วนจับคู่หน้าแถวเสมอ ถ้า BUY.price >= SELL.price จะเกิดการเทรดที่ราคา SELL.price
5. ตัดจำนวนเท่าที่แมตช์ได้ออกจากทั้งสองฝั่ง ถ้าฝั่งใดเป็นศูนย์ให้ลบออเดอร์นั้นออกจาก DB (หรืออัปเดตจำนวนที่เหลือ)
6. บันทึกเหตุการณ์ TRADE ลง logs/orders/all.jsonl

ข้อดีในตอนที่ออกแบบที่ตั้งใจไว้  :   

        " เราจะพยายามทำ Matchng โดยดึงข้อมูลทั้งหมดมาทำงานใน 1 ครั้งแต่ว่าจะทำเป็นรอบๆไปทุก 7 วินาที  "
*/
async function runMatching() {
    if (isMatching) return; // prevent re-entry
    isMatching = true;
    try {
        // fetch once
        const allOrders = await Order.findAll();
        // group by cryptoid
        const map = new Map();
        for (const o of allOrders) {
            const key = o.cryptoid;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(o);
        }

        // process each market within a transaction sequentially to avoid deadlock
        for (const [cryptoid, orders] of map.entries()) {
            await sequelize.transaction(async (t) => {
                // split
                const buys = orders
                    .filter(o => String(o.type).toUpperCase() === 'BUY')
                    .sort((a, b) => (b.price - a.price) || (a.id - b.id));
                const sells = orders
                    .filter(o => String(o.type).toUpperCase() === 'SELL')
                    .sort((a, b) => (a.price - b.price) || (a.id - b.id));

                let bi = 0, si = 0;
                while (bi < buys.length && si < sells.length) {
                    const buy = buys[bi];
                    const sell = sells[si];
                    if (Number(buy.price) < Number(sell.price)) break; // no more match

                    const tradeAmount = Math.min(Number(buy.amount), Number(sell.amount));
                    const tradePrice = Number(sell.price); // execute at sell price

                    // log trade
                    appendOrderLog({
                        event: 'TRADE',
                        cryptoid,
                        buyId: buy.id,
                        sellId: sell.id,
                        amount: tradeAmount,
                        price: tradePrice
                    });

                    // update DB rows
                    const newBuyAmt = Number(buy.amount) - tradeAmount;
                    const newSellAmt = Number(sell.amount) - tradeAmount;

                    if (newBuyAmt <= 0) {
                        await Order.destroy({ where: { id: buy.id }, transaction: t });
                        bi++;
                    } else {
                        await Order.update({ amount: newBuyAmt }, { where: { id: buy.id }, transaction: t });
                        buy.amount = newBuyAmt;
                    }

                    if (newSellAmt <= 0) {
                        await Order.destroy({ where: { id: sell.id }, transaction: t });
                        si++;
                    } else {
                        await Order.update({ amount: newSellAmt }, { where: { id: sell.id }, transaction: t });
                        sell.amount = newSellAmt;
                    }
                }
            });
        }
    } catch (err) {
        appendOrderLog({ event: 'MATCH_ERROR', error: String(err && err.message ? err.message : err) });
    } finally {
        isMatching = false;
    }
}

function triggerMatchSoon() {
    if (!pendingMatch) return;
    // A simple debounce to let the interval pick it up soon
}

// Interval scheduler: every 7s if there is pending work
setInterval(async () => {
    if (!pendingMatch) return;
    pendingMatch = false; // consume flag
    await runMatching();
}, 7000);

module.exports = router;
