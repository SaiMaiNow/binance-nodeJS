const express = require('express');
const router = express.Router();

const { appendLogJson } = require('../../function/log');
const {addWallet, deleteWallet} = require('../../function/wallet');

const Wallet = require('../../models/wallet');
const Users = require('../../models/users');
const Crypto = require('../../models/crypto');

/**
 * เพิ่มเหรียญเข้า wallet ของ user (Buy)
 * POST /api/wallet/add/:id
 */
router.post('/add/:id', addWallet);
router.get('/get/:id', getWallet);
router.put('/update/:id', updateWallet);

/**
 * ขายเหรียญ (ลบออกจาก wallet)
 * DELETE /api/wallet/delete/:id
 */
router.delete('/delete/:id', deleteWallet);

/**
 * ดูเหรียญทั้งหมดใน wallet ของ user
 * GET /api/wallet/get/:id
 */
async function getWallet(req, res) {
    const userId = req.params.id;
    try {
        // ดึงข้อมูลเหรียญทั้งหมดของ user
        const wallets = await Wallet.findAll({
            where: { userid: userId },
            attributes: ['cryptoid', 'amount', 'price']
        });

        if (wallets.length === 0) {
            return res.status(404).json({ error: 'User not found or wallet empty' });
        }

        // จัดรูปแบบข้อมูลสำหรับ response
        const userWallet = {
            userId,
            history: wallets.map(row => ({
                crypto: row.cryptoid,
                amount: row.amount,
                price: row.price
            }))
        };
        res.json(userWallet);
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
}

/**
 * แก้ไขจำนวนเหรียญใน wallet (set ค่าใหม่)
 * PUT /api/wallet/update/:id
 */
async function updateWallet(req, res) {
    const userId = req.params.id;
    const { cryptoid, amount, price } = req.body;

    if (!cryptoid) {
        return res.status(400).json({ error: 'Missing cryptoid' });
    }

    try {
        // อัปเดตจำนวนและราคาของเหรียญ
        const walletEntry = await Wallet.findOne({ where: { userid: userId, cryptoid } });
        if (!walletEntry) {
            return res.status(404).json({ error: 'Wallet entry not found' });
        }

        await walletEntry.update({ amount, price });

        // log การอัปเดต
        appendLogJson({
            type: "UPDATE",
            userId,
            crypto: cryptoid,
            totalAmount: amount,
            price
        }, 'wallet-log');

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
}

module.exports = router;
