const cryptosService = require('./cryptos.service');
const fs = require('fs');
const path = require('path');

// เก็บออเดอร์ในหน่วยความจำเพื่อเดโม (ของจริงค่อยย้ายไป DB/Sequelize)
const orders = new Map(); // id -> order
let nextId = 1;

function ensureUserLogPath(userId) {
    const baseDir = path.join(process.cwd(), 'logs', 'orders');
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    return path.join(baseDir, `${String(userId)}.jsonl`);
}

function appendUserLog(userId, payload) {
    try {
        const file = ensureUserLogPath(userId);
        const line = JSON.stringify(payload) + '\n';
        fs.appendFile(file, line, (err) => {
            if (err) {
                // ไม่ throw เพื่อไม่ให้กระทบ flow หลักของ API
                console.error('appendUserLog error:', err.message);
            }
        });
    } catch (e) {
        console.error('appendUserLog exception:', e.message);
    }
}

async function createBuySell({ type, symbol, amount, price, userId = 'default' }) {
    if (!['BUY', 'SELL'].includes(String(type))) {
        throw new Error('type ต้องเป็น BUY หรือ SELL');
    }
    if (!symbol || Number(amount) <= 0) {
        throw new Error('symbol และ amount > 0 จำเป็น');
    }

    // ถ้าไม่ส่ง price มา ให้ดึงราคาตลาดจาก Binance
    const usePrice = price ? Number(price) : await cryptosService.getUsdPrice(symbol);

    const order = {
        id: nextId++,
        userId: String(userId),
        type: String(type).toUpperCase(),
        symbol: String(symbol).toUpperCase(),
        amount: Number(amount),
        price: usePrice,
        totalValue: Number(amount) * usePrice,
        status: 'EXECUTED',
        createdAt: new Date().toISOString()
    };

    orders.set(order.id, order);

    // เขียน log ต่อผู้ใช้ (JSONL one-line)
    appendUserLog(userId, {
        date: new Date().toISOString(),
        userId: String(userId),
        type: order.type,
        symbol: order.symbol,
        amount: order.amount,
        price: order.price,
        totalValue: order.totalValue,
        status: order.status,
        orderId: order.id
    });

    return order;
}

async function getById(id) {
    return orders.get(Number(id)) || null;
}

async function updateStatus(id, status) {
    const order = orders.get(Number(id));
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    orders.set(order.id, order);

    return order;
}

async function deleteById(id) {
    return orders.delete(Number(id));
}

async function getUserOrders(userId) {
    const userOrders = [];
    for (const order of orders.values()) {
        if (order.userId === String(userId)) {
            userOrders.push(order);
        }
    }
    return userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
    createBuySell,
    getById,
    updateStatus,
    deleteById,
    getUserOrders
};