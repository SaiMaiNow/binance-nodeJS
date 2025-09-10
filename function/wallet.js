const { getPool } = require('./postgre');
const { appendLogJson } = require('./log');

// POST /api/users/:id/wallet
exports.addWallet = async (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount, price } = req.body;
    if (!cryptoid || !amount || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const date = new Date().toISOString();

    try {
        const pool = getPool();

        const userCheck = await pool.query(
            `SELECT id FROM users WHERE id = $1`,
            [userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: `User id ${userId} does not exist` });
        }

        // upsert (insert / update)
        await pool.query(`
            INSERT INTO wallet (userid, cryptoid, amount, price)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (userid, cryptoid)
            DO UPDATE SET amount = wallet.amount + EXCLUDED.amount, price = EXCLUDED.price;
        `, [userId, cryptoid, amount, price]);

        // ดึง totalAmount หลังอัปเดต
        const totalResult = await pool.query(
            `SELECT amount FROM wallet WHERE userid = $1 AND cryptoid = $2`,
            [userId, cryptoid]
        );
        const totalAmount = totalResult.rows.length > 0 ? totalResult.rows[0].amount : amount;

        appendLogJson({
            type: "BUY",
            userId,
            crypto: cryptoid,
            amountBought: amount,
            totalAmount: totalAmount,
            price,
            date
        }, 'wallet-log');
    } catch (err) {
        return res.status(500).json({ error: 'Database error', detail: err.message });
    }

    res.status(201).json({ success: true });
};

// GET /api/users/:id/wallet
exports.getWallet = async (req, res) => {
    const userId = req.params.id;
    try {
        const pool = getPool();

        const result = await pool.query(
            `SELECT cryptoid, amount, price FROM wallet WHERE userid = $1`,
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userWallet = {
            userId,
            history: result.rows.map(row => ({
                crypto: row.cryptoid,
                amount: row.amount,
                price: row.price
            }))
        };
        res.json(userWallet);
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
};

// PUT /api/users/:id/wallet
exports.updateWallet = async (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount, price } = req.body;
    if (!cryptoid) return res.status(400).json({ error: 'Missing cryptoid' });

    // Add to DB here (PostgreSQL)
    try {
        const pool = getPool();
        const result = await pool.query(
            `UPDATE wallet SET amount = $1, price = $2 WHERE userid = $3 AND cryptoid = $4 RETURNING *`,
            [amount, price, userId, cryptoid]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Wallet entry not found' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Database error', detail: err.message });
    }

    appendLogJson({
        type: "UPDATE",
        userId,
        crypto: cryptoid,
        totalAmount: amount,
        price
    }, 'wallet-log');
    res.json({ success: true });
};

// DELETE /api/users/:id/wallet
exports.deleteWallet = async (req, res) => {
    const userId = req.params.id;
    const { cryptoid, amount } = req.body;
    if (!cryptoid || !amount) return res.status(400).json({ error: 'Missing cryptoid or amount' });

    try {
        const pool = getPool();
        const check = await pool.query(
            `SELECT amount FROM wallet WHERE userid = $1 AND cryptoid = $2`,
            [userId, cryptoid]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet entry not found' });
        }
        const currentAmount = Number(check.rows[0].amount);
        if (currentAmount < Number(amount)) {
            return res.status(400).json({ error: 'Not enough amount to sell' });
        }

        if (currentAmount === Number(amount)) {
            await pool.query(
                `DELETE FROM wallet WHERE userid = $1 AND cryptoid = $2`,
                [userId, cryptoid]
            );
        } else {
            await pool.query(
                `UPDATE wallet SET amount = $1 WHERE userid = $2 AND cryptoid = $3`,
                [currentAmount - Number(amount), userId, cryptoid]
            );
        }
    } catch (err) {
        return res.status(500).json({ error: 'Database error', detail: err.message });
    }

    appendLogJson({
        type: "SELL",
        userId,
        crypto: cryptoid,
        amountSold: Number(amount),
        totalAmount: Number(amount),
        date: new Date().toISOString()
    }, 'wallet-log');
    res.status(200).json({ success: true });
};
