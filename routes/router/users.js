const express = require('express');
const router = express.Router();

router.post("/register", (req, res) => {
  const { firstName, lastName, email, password, tel, birthday } = req.body;

  try {
    
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;