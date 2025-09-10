const fs = require('fs');
const path = require('path');

// --- In-memory wallets (no database/json file) ---
//let wallets = [];

// POST /api/users/:id/wallet
exports.addWallet = (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount, price } = req.body;
    if (!cryptoid || !amount || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    let userWallet = wallets.find(w => w.userId === userId);
    if (!userWallet) {
        userWallet = { userId, history: [] };
        wallets.push(userWallet);
    }
    const date = new Date().toISOString();
    let found = userWallet.history.find(h => h.crypto === cryptoid);
    let totalAmount;
    if (found) {
        found.amount = String(Number(found.amount) + Number(amount));
        found.price = price;
        found.date = date;
        totalAmount = String( Number(found.amount) );
    } else {
        userWallet.history.push({ crypto: cryptoid, amount, price, date });
        totalAmount = String( Number(amount) );
    }

    // Add to DB here (not implemented)

    appendLogJson({
        type: "BUY",
        userId,
        crypto: cryptoid,
        amountBought: amount,
        totalAmount,
        price,
        date
    }, 'wallet-log');
    res.status(201).json(userWallet);
};

// GET /api/users/:id/wallet
exports.getWallet = (req, res) => {
    const userId = req.params.id;
    const userWallet = wallets.find(w => w.userId === userId);
    if (!userWallet) return res.status(404).json({ error: 'User not found' });
    res.json(userWallet);
};

// PUT /api/users/:id/wallet
exports.updateWallet = (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount, price, date } = req.body;
    const userWallet = wallets.find(w => w.userId === userId);
    if (!userWallet) return res.status(404).json({ error: 'User not found' });
    const tx = userWallet.history.slice().reverse().find(h => h.crypto === cryptoid);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (amount !== undefined) tx.amount = amount;
    if (price !== undefined) tx.price = price;
    if (date !== undefined) tx.date = date;
    //const logAction = action === 'sell' ? 'SELL' : 'UPDATE';
    const logDate = date || new Date().toISOString();

    // Add to DB here (not implemented)

    appendLogJson({
        type: "UPDATE",
        userId,
        crypto: cryptoid,
        totalAmount: Number(tx.amount),
        price: price ?? tx.price,
        date: logDate
    }, 'wallet-log');
    res.json(userWallet);
};

// DELETE /api/users/:id/wallet
exports.deleteWallet = (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount } = req.body;
    const userWallet = wallets.find(w => w.userId === userId);
    if (!userWallet) return res.status(404).json({ error: 'User not found' });
    const date = new Date().toISOString();
    let found = userWallet.history.find(h => h.crypto === cryptoid);
    if (!found) return res.status(404).json({ error: 'Crypto not found' });
    if (Number(found.amount) < Number(amount)) {
        return res.status(400).json({ error: 'Not enough amount to sell' });
    }
    found.amount = Number(found.amount) - Number(amount);
    const totalAmount = String( Number(found.amount) );

    // Add to DB here (not implemented)

    appendLogJson({
        type: "SELL",
        userId,
        crypto: cryptoid,
        amountSold: String( Number(amount) ),
        totalAmount,
        date
    }, 'wallet-log');
    if (found.amount === 0) {
        userWallet.history = userWallet.history.filter(h => h.crypto !== cryptoid);
    }
    res.status(200).json({ success: true });
};
