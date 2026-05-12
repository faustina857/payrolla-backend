const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const authController = require('./authController')
const { protect, restrictTo } = require('./authMiddleware')
const validate = require('../utils/validate')
const authValidation = require('./authValidation')

// ─── Rate Limiters ────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 reset requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset requests. Please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})


// ─── Public Routes ────────────────────────────────────────
// (no authentication required)

// superAdmin registration — one time only
router.post( '/register', validate(authValidation.register), authController.register
)

// login
router.post( '/login', loginLimiter, validate(authValidation.login), authController.login
)

// forgot password
router.post( '/forgot-password', forgotPasswordLimiter, validate(authValidation.forgotPassword), authController.forgotPassword
)

// reset password
router.patch( '/reset-password/:token', validate(authValidation.resetPassword), authController.resetPassword
)

// accept invite
router.post(
  '/accept-invite',
  validate(authValidation.acceptInvite),
  authController.acceptInvite
)

// ─── Protected Routes ─────────────────────────────────────
// (authentication required)

// get current logged in user
router.get('/me', protect, authController.getMe)

// logout
router.post('/logout', protect, authController.logout)

// change password
router.patch( '/change-password',
  protect, validate(authValidation.changePassword), authController.changePassword
)

// resend invite — HR/Admin only
router.post(
  '/resend-invite/:employeeId', protect,
  restrictTo('superAdmin', 'admin', 'hr'),
  authController.resendInvite
)


module.exports = router