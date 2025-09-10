const express = require('express');
const router = express.Router();

const { getPool } = require('../../function/postgre');

router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password, tel, birthday } = req.body;

  try {
    const pool = getPool();
    const query = `INSERT INTO users (first_name, last_name, email, password, tel, birthday) VALUES ($1, $2, $3, $4, $5, $6)`;
    const values = [firstName, lastName, email, password, tel, birthday];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "User registration failed" });
    }

    req.session.user = {  
      id: result.rows[0].id,
      email: result.rows[0].email,
    }

    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;