const express = require('express');
const router = express.Router();

const { getPool } = require('../../function/postgre');

router.post("/register", async (req, res) => {
  const { fName, lName, email, password, tel, birthday } = req.body;

  try {
    if (!fName || !lName || !tel || !email || !password || !birthday) return res.status(400).json({ message: "No fields to register" });

    if(validateBirthday(birthday)) return res.status(400).json({ message: "Invalid birthday" });

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
      email: email,
    }

    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/update", async (req, res) => {
  const { fName, lName, email, password, tel } = req.body;

  try {
    if (!fName && !lName && !tel && !email && !password) return res.status(400).json({ message: "No fields to update" });

    const userCache = req.session.user;
    if (!userCache?.email) return res.status(400).json({ message: "User is not Logged in" });

    const pool = getPool();
    const userQuery = await pool.query('SELECT "firstName", "lastName", "tel", "email", "password" FROM users WHERE email = $1', [userCache.email]);
    if (userQuery.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    let NewFName = userQuery.rows[0].firstName;
    let NewLName = userQuery.rows[0].lastName;
    let NewTel = userQuery.rows[0].tel;
    let NewEmail = userQuery.rows[0].email;
    let NewPassword = userQuery.rows[0].password;

    if (fName) NewFName = fName;
    if (lName) NewLName = lName;
    if (tel) NewTel = tel;
    if (email) NewEmail = email;
    if (password) NewPassword = password;

    const updateQuery = await pool.query('UPDATE users SET "firstName" = $1, "lastName" = $2, "tel" = $3, "email" = $4, "password" = $5 WHERE email = $6', [NewFName, NewLName, NewTel, NewEmail, NewPassword, userCache.email]);
    if (updateQuery.rowCount === 0) {
      return res.status(400).json({ message: "User update failed" });
    }

    return res.status(200).json({ message: "User updated successfully", user: { fName: NewFName, lName: NewLName, tel: NewTel, email: NewEmail, password: NewPassword } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

function validateBirthday(birthday) {
  const dateFormat = new Date(birthday).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - dateFormat;
  if (dateFormat > currentYear) return false;
  if (age > 100 || age < 20) return false;
  return true;
}

module.exports = router;