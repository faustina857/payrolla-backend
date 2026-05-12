const authService = require('./authService')
const validate = require('../utils/validate')
const authValidation = require('./authValidation')

// ─── Register (SuperAdmin only, one time) ─────────────────
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body)

    res.status(201).json({
      status: 'success',
      message: 'Super admin account created successfully',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Login ────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for']
    const userAgent = req.headers['user-agent'] 
    const user = await authService.login(req.body, res, ipAddress, userAgent)

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Logout ───────────────────────────────────────────────
const logout = (req, res, next) => {
  try {
    authService.logout(res)

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    })
  } catch (error) {
    next(error)
  }
}

// ─── Get Current User ─────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id)

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Forgot Password ──────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email)

    // always return success even if email doesn't exist
    // so we don't reveal which emails are registered
    res.status(200).json({
      status: 'success',
      message: 'If that email exists you will receive a reset link shortly',
    })
  } catch (error) {
    next(error)
  }
}

// ─── Reset Password ───────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params
    const { password } = req.body

    const user = await authService.resetPassword(token, password)

    // log them in automatically after reset
    const jwtToken = authService.generateToken(user._id)
    authService.attachCookie(res, jwtToken)

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    })
  } catch (error) {
    next(error)
  }
}

// ─── Change Password ──────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    await authService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    )

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

// ─── Accept Invite ────────────────────────────────────────
const acceptInvite = async (req, res, next) => {
  try {
    const { token, password } = req.body

    const user = await authService.acceptInvite(token, password, res)

    res.status(200).json({
      status: 'success',
      message: 'Invite accepted successfully. Welcome to Payrolla.',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Resend Invite ────────────────────────────────────────
const resendInvite = async (req, res, next) => {
  try {
    const employee = await authService.resendInvite(req.params.employeeId)

    res.status(200).json({
      status: 'success',
      message: `Invite resent to ${employee.firstName} ${employee.lastName}`,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { register,  login,  logout,  getMe,  forgotPassword,  resetPassword,  changePassword, acceptInvite, resendInvite
}