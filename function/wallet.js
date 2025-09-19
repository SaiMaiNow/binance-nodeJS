async function addWallet(req, res) {
    const userId = req.params.id;
    const { cryptoid, amount, price } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!cryptoid || !amount || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const date = new Date().toISOString();

    try {
        // ตรวจสอบว่ามี user นี้อยู่จริงหรือไม่
        const userCheck = await Users.findOne({ where: { id: userId } });
        if (!userCheck) {
            return res.status(400).json({ error: `User id ${userId} does not exist` });
        }

        const CryptoCheck = await Crypto.findOne({ where: { id: cryptoid } });
        if (!CryptoCheck) {
            return res.status(400).json({ error: `Cryptoid ${cryptoid} does not exist` });
        }

        // ตรวจสอบว่ามีเหรียญนี้ใน wallet หรือไม่
        const walletCheck = await Wallet.findOne({ where: { userid: userId, cryptoid } });
        let totalAmount;
        // upsert: ถ้ามีเหรียญนี้อยู่แล้วให้บวกจำนวน, ถ้ายังไม่มีให้เพิ่มใหม่
        if (walletCheck) {
            await walletCheck.update({
                amount: walletCheck.amount + Number(amount),
                price: Number(price)
            });
            totalAmount = walletCheck.amount + Number(amount);
        } else {
            await Wallet.create({ userid: userId, cryptoid, amount, price });
            totalAmount = Number(amount);
        }

        // log การซื้อ
        appendLogJson({
            type: "BUY",
            userId,
            crypto: cryptoid,
            amountBought: amount,
            totalAmount,
            price,
            date
        }, 'wallet-log');

        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
}

async function deleteWallet(req, res) {
    const userId = req.params.id;
    const { cryptoid, amount } = req.body;

    if (!cryptoid || !amount) {
        return res.status(400).json({ error: 'Missing cryptoid or amount' });
    }

    try {
        // ตรวจสอบจำนวนเหรียญที่มีอยู่
        const walletEntry = await Wallet.findOne({ where: { userid: userId, cryptoid } });
        if (!walletEntry) {
            return res.status(404).json({ error: 'Wallet entry not found' });
        }

        const currentAmount = Number(walletEntry.amount);
        const sellAmount = Number(amount);

        if (currentAmount < sellAmount) {
            return res.status(400).json({ error: 'Not enough amount to sell' });
        }

        // ถ้าขายหมด ให้ลบ record ออก, ถ้ายังเหลือให้ update จำนวน
        if (currentAmount === sellAmount) {
            await walletEntry.destroy();
        } else {
            await walletEntry.update({ amount: currentAmount - sellAmount });
        }

        // log การขาย
        appendLogJson({
            type: "SELL",
            userId,
            crypto: cryptoid,
            amountSold: sellAmount,
            totalAmount: currentAmount - sellAmount,
            date: new Date().toISOString()
        }, 'wallet-log');

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error', detail: err.message });
    }
}

module.exports = {
    addWallet,
    deleteWallet
};
