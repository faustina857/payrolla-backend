const jwt = require('jsonwebtoken')
const User = require('./authModel')
const { jwtSecret } = require('../config/env')

// Protect Route
// verifies JWT cookie and attaches user to req.user
const protect = async (req, res, next) => {
  try {
    // get token from cookie
    const token = req.cookies.jwt
    if (!token || token === 'loggedout') {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in. Please log in to continue',
      })
    }

    // verify token
    const decoded = jwt.verify(token, jwtSecret)
    // check if user still exists
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists',
      })
    }

    // check if user account is still active
    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated. Contact your administrator',
      })
    }

    // attach user to request object
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please log in again',
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Your session has expired. Please log in again',
      })
    }
    next(error)
  }
}

// Restrict To
// restricts route access to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action',
      })
    }
    next()
  }
}

module.exports = { protect, restrictTo }