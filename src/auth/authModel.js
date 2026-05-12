const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never returned in API responses
    },
    role: {
      type: String,
      enum: ['superAdmin', 'admin', 'hr', 'employee'],
      default: 'employee',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'terminated'],
      default: 'active',
    },
    // links this user to an employee record if they are an employee
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    // for password reset flow
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // tracks when user last logged in
    lastLogin: {
      type: Date,
      default: null,
    },
    // for invite-based onboarding
    isInviteAccepted: {
      type: Boolean,
      default: false,
    },
    inviteToken: {
      type: String,
      select: false,
    },
    inviteTokenExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
)

// hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

// method to compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', userSchema)