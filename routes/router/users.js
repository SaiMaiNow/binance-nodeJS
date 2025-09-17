const express = require('express');
const router = express.Router();

const { Users } = require('../../models/users');

router.post("/register", async (req, res) => {
  const { fName, lName, email, password, tel, birthday } = req.body;

  try {
    if (!fName || !lName || !tel || !email || !password || !birthday) return res.status(400).json({ message: "No fields to register" });

    if(!validateBirthday(birthday)) return res.status(400).json({ message: "Invalid birthday" });
    const selectQuery = await Users.findOne({ where: { email } });
    if (selectQuery) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await Users.create({ firstName: fName, lastName: lName, email, password, tel, birthday });
    if (!result) {
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

    const userQuery = await Users.findOne({ where: { email: userCache.email } });
    if (!userQuery) {
      return res.status(400).json({ message: "User not found" });
    }

    let NewFName = userQuery.firstName;
    let NewLName = userQuery.lastName;
    let NewTel = userQuery.tel;
    let NewEmail = userQuery.email;
    let NewPassword = userQuery.password;

    if (fName) NewFName = fName;
    if (lName) NewLName = lName;
    if (tel) NewTel = tel;
    if (email) NewEmail = email;
    if (password) NewPassword = password;

    const updateQuery = await Users.update({ firstName: NewFName, lastName: NewLName, tel: NewTel, email: NewEmail, password: NewPassword }, { where: { email: userCache.email } });
    if (!updateQuery) {
      return res.status(400).json({ message: "User update failed" });
    }

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({message: 'Email and password are required' });
    }

    const getMatchUser = await Users.findOne({
      where: { email, password } 
    });

    if(!getMatchUser){
      console.error('User not found or password mismatch');
      return res.status(401).json({message: 'Invalid email or password' });
    }

    req.session.user = {
      email: getMatchUser.email
    };

    res.status(200).json({message: 'Login successful' });
    

  } catch (err){
    console.error('Login Error:', err);
    res.status(500).json({message: 'Internal server error' });
  }
});

router.post('/logout',requireAuth, async (req, res) => {
  try{
    req.session.destroy(err => {
      if (err) {
          console.error('Logout:', err);
          return res.status(500).json({message: 'Internal server error' });
      }

      res.status(200).json({message: 'Logout successful' });
  });

  }catch(err){
    console.error('Logout Error:', err);
    res.status(500).json({message: 'Internal server error' });
  }

});

router.get('/check',requireAuth, (req, res) => {
    try {

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

router.get('/:id', requireAuth, requireOwnership, async (req, res) => {
  const userId = req.params.id;

  try {
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const userData = await Users.findOne({
      where: { id: userId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'tel', 'birthday']
    });
    
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ 
      message: "User profile",
      user: userData 
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete('/delete', requireAuth, requireOwnership, async (req, res) => {
  try {
    const userCache = req.session.user;
    
    const deleteQuery = await Users.destroy({
      where: { email: userCache.email } 
    });
    
    if (!deleteQuery) {
      return res.status(400).json({ message: "User deletion failed" });
    }

    req.session.destroy(err => {
      if (err) {
          console.error('Logout:', err);
          return res.status(500).json({message: 'Internal server error' });
      }
    });

    return res.status(200).json({ message: "User deleted successfully" });
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

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

function requireOwnership(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userId = req.params.id;
  const sessionUserEmail = req.session.user.email; 
  
  Users.findOne({
    where: { email: sessionUserEmail } 
  }).then(user => {
      if (!user || user.id != userId) {
        return res.status(403).json({ message: 'Access denied - Not profile owner' });
      }
      next();
    })
    .catch(error => {
      console.error('Ownership check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    });
}

module.exports = router;