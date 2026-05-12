const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    // who heads this department
    hodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null, // can be assigned later
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Department', departmentSchema)