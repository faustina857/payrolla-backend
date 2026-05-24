const mongoose = require('mongoose')

const employeeSchema = new mongoose.Schema(
  {
    // Personal Info 
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
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Nigeria' },
    },
    profilePhoto: {
      type: String, // stores image URL
      default: null,
    },

    // Job Info 
    employeeId: {
      type: String,
      unique: true,
      required: [true, 'Employee ID is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ['fullTime', 'partTime', 'contract', 'intern'],
      required: [true, 'Employment type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null, // null means still employed
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'onLeave', 'suspended', 'terminated'],
      default: 'active',
    },
    terminationReason: {
      type: String,
      default: null,
    },

    // Status History
    suspensionReason: {
      type: String,
      default: null,
    },
    suspensionEndDate: {
      type: Date,
      default: null,
    },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'maternity', 'paternity', 'unpaid'],
      default: null,
    },
    leaveStartDate: {
      type: Date,
      default: null,
    },
    leaveEndDate: {
      type: Date,
      default: null,
    },
    leaveReason: {
      type: String,
      default: null,
    },

    // Salary Structure
    salary: {
      basicSalary: {
        type: Number,
        required: [true, 'Basic salary is required'],
        min: 0,
      },
      housing: {
        type: Number,
        default: 0,
      },
      transport: {
        type: Number,
        default: 0,
      },
      meal: {
        type: Number,
        default: 0,
      },
      utility: {
        type: Number,
        default: 0,
      },
      // gross = basicSalary + all allowances
      // not stored — calculated at payroll run time
    },
    gradeLevel: {
      type: String,
      trim: true,
      default: null, // e.g 'Level 1', 'Senior', 'Manager'
    },

    // Bank Details
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      accountName: {
        type: String,
        trim: true,
      },
    },

    // Tax & Pension
    taxIdentificationNumber: {
      type: String,
      trim: true,
      default: null,
    },
    pensionFundAdministrator: {
      type: String, 
      trim: true,
      default: null,
    },
    pensionPin: {
      type: String,
      trim: true,
      default: null,
    },

    // System Reference
    // links to the user account of this employee
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Employee', employeeSchema)