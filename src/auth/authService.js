const crypto = require('crypto')
const User = require('./authModel')
const Employee = require('../employees/employeeModel')
const { jwtSecret, jwtExpiresIn, jwtCookieExpiresIn } = require('../config/env')
const { sendEmail, emailTemplates } = require('../utils/email')
const jwt = require('jsonwebtoken')
const {createAuditLog} = require('../audit/auditService')

// ─── Generate JWT Token ───────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  })
}

// ─── Attach Token to Cookie ───────────────────────────────
const attachCookie = (res, token) => {
  res.cookie('jwt', token, {
    httpOnly: true, // not accessible via JavaScript
    secure: process.env.NODE_ENV === 'production', // https only in production
    sameSite: 'strict',
    expires: new Date(
      Date.now() + jwtCookieExpiresIn * 24 * 60 * 60 * 1000
    ),
  })
}

// ─── Register ─────────────────────────────────────────────
const register = async (data) => {
  const { firstName, lastName, email, password } = data

  // check if a superAdmin already exists
  const superAdminExists = await User.findOne({ role: 'superAdmin' })
  if (superAdminExists) {
    const error = new Error('Registration is not allowed. Contact your administrator')
    error.statusCode = 403
    throw error
  }

  // check if user already exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    const error = new Error('Email already in use')
    error.statusCode = 400
    throw error
  }

  // create user — password gets hashed by pre save hook
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: 'superAdmin', // first registered user is always superAdmin
  })

  await createAuditLog({
    performedBy: user._id,
    userSnapshot: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    action: 'LOGIN',
    module: 'auth',
    resourceId: user._id,
    description: `${user.firstName} ${user.lastName} registered as superAdmin`,
  })
  return user
}

// ─── Login ────────────────────────────────────────────────
const login = async (data, res, ipAddress, userAgent) => {
  const { email, password } = data

  // find user and include password for comparison
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    const error = new Error('Invalid email or password')
    error.statusCode = 401
    throw error
  }

  // check if account is active
  if (user.status !== 'active') {
    const error = new Error('Your account has been deactivated. Contact your administrator')
    error.statusCode = 403
    throw error
  }

  // compare password
  const isPasswordCorrect = await user.comparePassword(password)
  if (!isPasswordCorrect) {
    const error = new Error('Invalid email or password')
    error.statusCode = 401
    throw error
  }

  // update last login
  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })

  // generate token and attach to cookie
  const token = generateToken(user._id)
  attachCookie(res, token)

  // send login notification email
  const loginTime = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
  })

  const template = emailTemplates.loginNotification(
    user.firstName,
    loginTime,
    ipAddress, 
    userAgent
  )

  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  })

  // remove password from response
  user.password = undefined

  await createAuditLog({
    performedBy: user._id,
    userSnapshot: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    action: 'LOGIN',
    module: 'auth',
    resourceId: user._id,
    description: `${user.firstName} ${user.lastName} logged in`,
    ipAddress,
    userAgent,
  })

  return user
}

// ─── Logout ───────────────────────────────────────────────
const logout = (res) => {
  res.cookie('jwt', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 5 * 1000), // expires in 5 seconds
  })
}

// ─── Get Current User ─────────────────────────────────────
const getMe = async (userId) => {
  const user = await User.findById(userId).populate('employeeId')
  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  return user
}

// ─── Forgot Password ──────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await User.findOne({ email })

  // we don't reveal if email exists or not — security best practice
  if (!user) return

  // generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex')

  // hash token before saving to db
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // token expires in 10 minutes
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000

  await user.save({ validateBeforeSave: false })

  // send reset email with unhashed token
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

  const template = emailTemplates.passwordReset(resetUrl)

  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  })
}

// ─── Reset Password ───────────────────────────────────────
const resetPassword = async (token, newPassword) => {
  // hash the token from the url to compare with db
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')

  // find user with valid token that hasn't expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  })

  if (!user) {
    const error = new Error('Token is invalid or has expired')
    error.statusCode = 400
    throw error
  }

  // set new password and clear reset token fields
  user.password = newPassword
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined

  await user.save()

  await createAuditLog({
    performedBy: user._id,
    userSnapshot: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    action: 'PASSWORD_RESET',
    module: 'auth',
    resourceId: user._id,
    description: `${user.firstName} ${user.lastName} reset their password`,
  })

  return user
}

// ─── Change Password ──────────────────────────────────────
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password')

  // verify current password
  const isPasswordCorrect = await user.comparePassword(currentPassword)
  if (!isPasswordCorrect) {
    const error = new Error('Current password is incorrect')
    error.statusCode = 401
    throw error
  }

  user.password = newPassword
  await user.save()

  await createAuditLog({
    performedBy: user._id,
    userSnapshot: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    action: 'PASSWORD_CHANGED',
    module: 'auth',
    resourceId: user._id,
    description: `${user.firstName} ${user.lastName} changed their password`,
  })

  return user
}

// ─── Accept Invite ────────────────────────────────────────
const acceptInvite = async (token, password, res) => {
  // hash the token from the request to compare with db
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')

  // find user with valid token that hasn't expired
  const user = await User.findOne({
    inviteToken: hashedToken,
    inviteTokenExpires: { $gt: Date.now() },
  })

  if (!user) {
    const error = new Error('Invite token is invalid or has expired')
    error.statusCode = 400
    throw error
  }

  // set password and mark invite as accepted
  user.password = password
  user.isInviteAccepted = true
  user.inviteToken = undefined
  user.inviteTokenExpires = undefined
  user.status = 'active'

  await user.save()

  // log them in automatically
  const jwtToken = generateToken(user._id)
  attachCookie(res, jwtToken)

  // send welcome email
  const template = emailTemplates.welcomeEmail(user.firstName)
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  })

  return user
}

// ─── Resend Invite ────────────────────────────────────────
const resendInvite = async (employeeId) => {
  const employee = await Employee.findById(employeeId)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  const user = await User.findById(employee.userId)
  if (!user) {
    const error = new Error('User account not found')
    error.statusCode = 404
    throw error
  }

  // check if invite already accepted
  if (user.isInviteAccepted) {
    const error = new Error('Employee has already accepted their invite')
    error.statusCode = 400
    throw error
  }

  // generate new invite token
  const inviteToken = crypto.randomBytes(32).toString('hex')
  const hashedInviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex')

  user.inviteToken = hashedInviteToken
  user.inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000
  await user.save({ validateBeforeSave: false })

  // send new invite email
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite/${inviteToken}`
  const template = emailTemplates.inviteEmployee(inviteUrl, employee.firstName)

  await sendEmail({
    to: employee.email,
    subject: template.subject,
    html: template.html,
  })

  return employee
}

module.exports = { register, login,  logout,  getMe,  forgotPassword,  resetPassword,  changePassword,
generateToken,  attachCookie, acceptInvite, resendInvite }