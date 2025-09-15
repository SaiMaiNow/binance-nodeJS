const express = require('express');
const router = express.Router();
const ordersService = require('../services/orders.service');

// POST /api/orders/buysell
router.post('/buysell',createBuySell);

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

        // ✅ Validation เช็คว่าข้อมูลครบไหม
        if (!type || !symbol || !amount || !price || !userId) {
            return res.status(400).json({
                success: false,
                error: { message: "กรุณากรอกข้อมูลให้ครบ: type, symbol, amount, price, userId" }
            });
        }

        const order = await ordersService.createBuySell({ type, symbol, amount, price, userId });
        res.json({ success: true, data: order });
    } catch (e) {
        // ✅ ถ้าเกิดจาก server จริง → 500
        console.error("Server error:", e);
        res.status(500).json({
            success: false,
            error: { message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: e.message }
        });
    }
}

async function getById(req, res) {
    try {
        const id = Number(req.params.id);

        // ✅ Validation: id ต้องเป็นตัวเลข
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: { message: "id ต้องเป็นตัวเลข" }
            });
        }

        const order = await ordersService.getById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: { message: "ไม่พบออเดอร์" }
            });
        }

        res.json({ success: true, data: order });
    } catch (e) {
        // ✅ server error
        console.error("Server error:", e);
        res.status(500).json({
            success: false,
            error: { message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: e.message }
        });
    }
}

const VALID_STATUSES = ["EXECUTED", "CANCELLED", "PENDING"];

async function updateById(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        // ✅ validation
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: { message: `status ต้องเป็น ${VALID_STATUSES.join(", ")}` }
            });
        }

        const order = await ordersService.updateStatus(id, status);
        if (!order) {
            return res.status(404).json({ success: false, error: { message: 'ไม่พบออเดอร์' } });
        }

        res.json({ success: true, data: order });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: { message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: e.message }
        });
    }
}


async function deleteById(req, res) {
    try {
        const id = Number(req.params.id);

        // ✅ validation
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: { message: "id ต้องเป็นตัวเลข" }
            });
        }

        const ok = await ordersService.deleteById(id);
        if (!ok) {
            return res.status(404).json({
                success: false,
                error: { message: "ไม่พบออเดอร์" }
            });
        }

        res.json({ success: true, message: "Deleted" });
    } catch (e) {
        console.error("Server error:", e);
        res.status(500).json({
            success: false,
            error: { message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: e.message }
        });
    }
}

// GET /api/orders/user/:userId
async function getUserOrders(req, res) {
    try {
        const userId = String(req.params.userId);

        // ✅ validation
        if (!userId || userId.trim() === "") {
            return res.status(400).json({
                success: false,
                error: { message: "userId จำเป็นต้องระบุ" }
            });
        }

        const orders = await ordersService.getUserOrders(userId);

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: "ไม่พบออเดอร์ของ user นี้" }
            });
        }

        res.json({
            success: true,
            data: orders
        });

    } catch (e) {
        console.error("Server error:", e);
        res.status(500).json({
            success: false,
            error: { message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", detail: e.message }
        });
    }
}
module.exports = router;