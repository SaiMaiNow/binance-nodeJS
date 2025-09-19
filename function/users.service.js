const Users  = require('../models/users');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

async function requireOwnership(req, res, next) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.params.id;
    const sessionUserEmail = req.session.user.email; 
    
    const user = await Users.findOne({
      where: { email: sessionUserEmail },
      attributes: ['id', 'email']
    });
    
    if (!user || user.id != userId) {
      return res.status(403).json({ message: 'Access denied - Not profile owner' });
    }
    
    next();
    
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ message: 'Authorization error' });
  }
}

module.exports = { requireAuth, requireOwnership };