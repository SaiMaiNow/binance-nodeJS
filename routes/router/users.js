const express = require('express');
const router = express.Router();

const { getPool } = require('../../function/postgre');

router.post("/register", async (req, res) => {
  const { fName, lName, email, password, tel, birthday } = req.body;

  try {
    const pool = getPool();

    const selectQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (selectQuery.rowCount > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await pool.query('INSERT INTO users ("firstName", "lastName", email, password, tel, birthday) VALUES ($1, $2, $3, $4, $5, $6)', [fName, lName, email, password, tel, birthday]);
    if (result.rowCount === 0) {
      return res.status(400).json({ message: "User registration failed" });
    }

    req.session.user = {
      fName: fName,
      lName: lName,
      email: email,
    }

    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users');

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User retrieved successfully", user: result.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;