const express = require('express');
const router = express.Router();

const Wallet = require('../../../models/wallet');
const Crypto = require('../../../models/crypto');
const { requireOwnership } = require('../../../function/users');
const { getUsdPrice } = require('../../../function/cryptos');

router.get('/get/:id', requireOwnership, getWallet);

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
            Wallet: await Promise.all(wallets.map(async row => {
                const crypto = await Crypto.findOne({ where: { id: row.cryptoid } });
                if (!crypto) {
                    return {
                        error: "Invalid symbol"
                    };
                }

                const currentPrice = await getUsdPrice(crypto.cryptoname);
                if (currentPrice === -1) {
                    return {
                        error: "Invalid symbol"
                    };
                }
                return {
                    crypto: row.cryptoid,
                    amount: row.amount,
                    buyPrice: row.price,
                    currentPrice: currentPrice,
                    profit: Number(((currentPrice - row.price) * row.amount * 100).toFixed(2))
                }
            }))
        };
        res.status(200).json(userWallet);
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
}

module.exports = router;
