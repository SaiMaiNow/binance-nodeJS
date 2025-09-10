const express = require('express');
const router = express.Router();
const ordersService = require('../services/orders.service');

// POST /api/orders/buysell
router.post('/buysell', express.json(), createBuySell);

// GET /api/orders/:id
router.get('/:id', getById);
/*
{
  "type": "BUY",
  "symbol": "ETH", 
  "amount": 0.1,
  "price": 50000,
  "userId": "ice"
} */

// PUT /api/orders/:id (ยกเลิก/แก้ไขสถานะ)
router.put('/:id', express.json(), updateById);
/*
{
  "type": "BUY",
  "symbol": "ETH", 
  "amount": 1.5,
  "price": 50000,
  "userId": "ice",
  "status": "PENDING"
} */

// DELETE /api/orders/:id
router.delete('/:id', deleteById);

// GET /api/orders/user/:userId (ดูออเดอร์ของ user)
router.get('/user/:userId', getUserOrders);

// Logic Action API
async function createBuySell(req, res) {
    try {
        const { type, symbol, amount, price, userId } = req.body || {};
        const order = await ordersService.createBuySell({ type, symbol, amount, price, userId });
        res.json({ success: true, data: order });
    } catch (e) {
        res.status(400).json({ success: false, error: { message: e.message } });
    }
}

async function getById(req, res) {
    try {
        const id = Number(req.params.id);
        const order = await ordersService.getById(id);
        if (!order) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบออเดอร์' } });
        }
        res.json({ success: true, data: order });
    } catch (e) {
        res.status(500).json({ success: false, error: { message: e.message } });
    }
}

async function updateById(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!status || !['EXECUTED', 'CANCELLED', 'PENDING'].includes(status)) {
            return res.status(400).json({ success: false, error: { message: 'status ต้องเป็น EXECUTED, CANCELLED, หรือ PENDING' } });
        }

        const order = await ordersService.updateStatus(id, status);
        if (!order) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบออเดอร์' } });
        }
        res.json({ success: true, data: order });
    } catch (e) {
        res.status(500).json({ success: false, error: { message: e.message } });
    }
}

async function deleteById(req, res) {
    try {
        const id = Number(req.params.id);
        const ok = await ordersService.deleteById(id);
        if (!ok) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบออเดอร์' } });
        }
        res.json({ success: true, message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ success: false, error: { message: e.message } });
    }
}

// GET /api/orders/user/ice
async function getUserOrders(req, res) {
    try {
        const userId = String(req.params.userId);
        const orders = await ordersService.getUserOrders(userId);

        res.json({
            success: true,
            data: orders
        });

    } catch (e) {
        res.status(500).json({
            success: false,
            error: { message: e.message }
        });
    }
}

module.exports = router;