const express = require('express');
const { sequelize } = require('../../../function/postgre');
const { addWallet, deleteWallet } = require('../../../function/wallet'); // Wallet functions
const Order = require('../../../models/order');
const { appendLogJson } = require('../../../function/log'); 
const Wallet = require('../../../models/wallet');
const Users = require('../../../models/users');

const { requireAuth, requireOwnership } = require('../../../function/users');

const router = express.Router();

// State for scheduled matching
let pendingMatch = false;
let isMatching = false;
let Istart = false; // เริ่ม false

// GET /api/order/book?cryptoid=1 -> order book by symbol/cryptoid
/*
--- คือเราดึงข้อมูลการซื้อขายมาทั้ง 2 ฝั่งคือ :  BUY / SELL        !! แต่เฉพาะเหรียญที่เราเรียกนะ ตาม id ของเหรียญนั้นๆ (เช่น  BTC : _id:1_ )
*/
router.get('/book', requireAuth, async (req, res) => {
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
router.post('/', requireOwnership, async (req, res) => {
    try {
        const { id, cryptoid, amount, price, type } = req.body || {};
        const userid = id;
        if (!userid || !cryptoid || !amount || !price || !type) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_BODY', message: 'ต้องมี userid, cryptoid, amount, price, type' } });
        }

        if (amount <= 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' } });
        }

        if (price < 0) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_PRICE', message: 'Price must be greater than 0' } });
        }

        const upType = String(type).toUpperCase();
        if (!['BUY', 'SELL'].includes(upType)) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'type ต้องเป็น BUY หรือ SELL' } });
        }

        if (type === 'SELL') {
            const wallet = await Wallet.findOne({ where: { userid, cryptoid }, attributes: ['amount'] });
            if (!wallet) {
                return res.status(400).json({ success: false, error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found' } });
            }
            if (wallet.amount < amount) {
                return res.status(400).json({ success: false, error: { code: 'WALLET_NOT_ENOUGH', message: 'Wallet not enough' } });
            }
        } else if (type === 'BUY') {
            const users = await Users.findOne({ where: { id: userid }, attributes: ['money'] });
            if (!users) {
                return res.status(400).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
            }
            if (users.money < price * amount) {
                return res.status(400).json({ success: false, error: { code: 'USER_NOT_ENOUGH', message: 'Money not enough' } });
            }
        }

        const created = await Order.create({ userid, cryptoid, amount, price, type: upType });
        appendLogJson({ event: 'CREATE', order: created.toJSON() }, 'orders');

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
router.put('/', requireAuth, async (req, res) => {
  try {
    const {amount, price, orderid} = req.body;

    const order = await Order.findOne({ where: { id: orderid } });

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบออเดอร์' } });
    }

    if (amount) order.amount = amount;
    if (price) order.price = price;

    if (order.type === 'SELL') {
        const wallet = await Wallet.findOne({ where: { userid: order.userid }, attributes: ['amount'] });
        if (!wallet) {
            return res.status(400).json({ success: false, error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found' } });
        }
        if (wallet.amount < order.amount) {
            return res.status(400).json({ success: false, error: { code: 'WALLET_NOT_ENOUGH', message: 'Wallet not enough' } });
        }
    } else if (order.type === 'BUY') {
        const users = await Users.findOne({ where: { id: order.userid }, attributes: ['money'] });
        if (!users) {
            return res.status(400).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
        }
        if (users.money < order.price * order.amount) {
            return res.status(400).json({ success: false, error: { code: 'USER_NOT_ENOUGH', message: 'Money not enough' } });
        }
    }

    await order.save();

    appendLogJson({ event: 'UPDATE', order: order.toJSON() }, 'orders');
    pendingMatch = true;

    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: { code: 'ORDER_UPDATE_FAILED', message: err.message } });
  }
});

// DELETE /api/order/:id -> cancel order
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const found = await Order.findByPk(id);
        if (!found) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบออเดอร์' } });
        await Order.destroy({ where: { id } });
        appendLogJson({ event: 'CANCEL', order: found.toJSON() }, 'orders');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'ORDER_DELETE_FAILED', message: err.message } });
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

                    const sellerWallet = await Wallet.findOne({
                        where: { 
                            userid: sell.userid, 
                            cryptoid: cryptoid
                        },
                        transaction: t
                    });

                    let iscontinue = false;

                    if (!sellerWallet || Number(sellerWallet.amount) < Number(sell.amount)) {
                        appendLogJson({
                            event: 'MATCH_ERROR',
                            error: `Seller ${sell.userid} does not have enough crypto ${cryptoid}`,
                            orderId: sell.id
                        }, 'orders');

                        await Order.destroy({ where: { id:sell.id }, transaction: t });
                        si++;
                        iscontinue = true;
                    }

                    const totalCost = Number(buy.amount) * Number(sell.price);
                    const buyerBalance = await Users.findOne({
                        where: { id: buy.userid },
                        attributes: ['money'],
                        transaction: t
                    });

                    if (!buyerBalance || Number(buyerBalance.money) < totalCost) {
                        appendLogJson({
                            event: 'MATCH_ERROR',
                            error: `Buyer ${buy.userid} does not have enough balance for order`,
                            orderId: buy.id
                        }, 'orders');

                        await Order.destroy({ where: { id:buy.id }, transaction: t });
                        bi++;
                        iscontinue = true;
                    }

                    if (iscontinue) continue;

                    const tradeAmount = Math.min(Number(buy.amount), Number(sell.amount));
                    const tradePrice = Number(sell.price); // execute at sell price

                    // log trade
                    appendLogJson({
                        event: 'TRADE',
                        cryptoid,
                        buyId: buy.id,
                        sellId: sell.id,
                        amount: tradeAmount,
                        price: tradePrice
                    }, 'orders');

                    await Users.update(
                        { money: Number(buyerBalance.money) - (tradeAmount * tradePrice) },
                        { where: { id: buy.userid }, transaction: t }
                    );

                    const sellerUser = await Users.findOne({
                        where: { id: sell.userid },
                        attributes: ['money'],
                        transaction: t
                    });
                    
                    await Users.update(
                        { money: Number(sellerUser.money) + (tradeAmount * tradePrice) },
                        { where: { id: sell.userid }, transaction: t }
                    );

                    // --- เพิ่มอัปเดต wallet ---
                    // BUY: เพิ่มเหรียญให้ผู้ซื้อ
                    await addWallet({
                        params: { id: buy.userid },
                        body: { cryptoid, amount: tradeAmount, price: tradePrice }
                    }, { status: () => ({ json: () => {} }) });

                    // SELL: ลบเหรียญจากผู้ขาย
                    await deleteWallet({
                        params: { id: sell.userid },
                        body: { cryptoid, amount: tradeAmount }
                    }, { status: () => ({ json: () => {} }) });

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
        console.error(err);
        appendLogJson({ event: 'MATCH_ERROR', error: String(err && err.message ? err.message : err) }, 'orders');
    } finally {
        isMatching = false;
    }
}


// Interval scheduler: every 7s if there is pending work
setInterval(async () => {
  // ให้รันถ้าเป็นการ start ครั้งแรก หรือมี pendingMatch
  if (!Istart || pendingMatch) {
    Istart = true;       // หลังจากรันครั้งแรกแล้วจะไม่เข้าเงื่อนไขนี้อีก เว้นแต่ pendingMatch=true
    pendingMatch = false;
    await runMatching();
  }
}, 7000);
module.exports = router;
