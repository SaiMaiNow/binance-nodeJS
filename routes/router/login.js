// import express from 'express';
const express = require('express');
const router = express.Router();
const { getPool } = require('../../function/postgre');

/*
const loginRouter = require('./router/login'); //เดี๋ยวเอาไปใส่ที่ app.js
app.use('/api/login',loginRouter);
*/


router.post('/', async (req, res) => {
  try{
    // res.send("Hello login");

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({message: 'Email and password are required' });
    }

    const pool = getPool();

    if (!pool) {
      return res.status(500).json({
          message: 'Database connection not available'
      });
    }

    const bcrypt = require('bcrypt');

    const getMatchUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    const userExists = getMatchUser.rows[0];
    if(!userExists){
      return res.status(401).json({message: 'Invalid email or password' });
    }
    const passwordMatch = await bcrypt.compare(password, userExists.password);
    if(!passwordMatch){
      return res.status(401).json({message: 'Invalid email or password' });
    }

    req.session.user = {
      id: userExists.id,
      email: userExists.email
    };

    res.status(200).json({message: 'Login successful' });
    

  } catch (err){
    res.status(500).json({message: 'Internal server error' });
  }
  

});

router.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout Error:', err);
        return res.status(500).json({message: 'Internal server error' });
      }

      return res.status(200).json({message: 'Logout successful' });
    });

  } catch (err) {
    console.error('Logout Error:', err);
    res.status(500).json({message: 'Internal server error' });
  }
});


router.get('/check', (req, res) => {
  try {
    if (!req.session.user) {
        return res.status(401).json({message: 'Not authenticated' });
    }

    return res.status(200).json({
        message: 'Authenticated',
        user: {
            email: req.session.user.email,
        }
    });

} catch (err) {
    console.error('Authenticated:', err);
    res.status(500).json({message: 'Internal server error' });
}
});
module.exports = router;



