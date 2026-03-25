const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_hackathon_key";

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains the userId we set in the controller
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};