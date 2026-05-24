const mongoose = require('mongoose')

const payrollSchema = new mongoose.Schema(
  {
    // Period
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
    // e.g 'November 2025' — generated from month + year
    period: {
      type: String,
      required: [true, 'Period is required'],
      unique: true, // only one payroll run per month
      trim: true,
    },
    payDate: {
      type: Date,
      default: null, // set when payroll is marked as paid
    },

    // Status & Approval Flow─
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'paid', 'cancelled'],
      default: 'draft',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null until approved
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // Financial Summary
    summary: {
      totalEmployees: {
        type: Number,
        default: 0, // how many employees were in this run
      },
      totalGrossSalary: {
        type: Number,
        default: 0, // sum of all employees gross salaries
      },
      totalDeductions: {
        type: Number,
        default: 0, // sum of all deductions across employees
      },
      totalNetSalary: {
        type: Number,
        default: 0, // sum of all net pay = gross - deductions
      },
      totalPaye: {
        type: Number,
        default: 0, // total PAYE tax across all employees
      },
      totalPension: {
        type: Number,
        default: 0, // total employee pension contributions
      },
      totalEmployerPension: {
        type: Number,
        default: 0, // total employer pension contributions
      },
      totalNhf: {
        type: Number,
        default: 0, // total NHF deductions
      },
    },

    // Notes
    notes: {
      type: String,
      trim: true,
      default: null, 
    },
    submissionNotes: {
      type: String,
      default: null,
    },
    approvalNotes: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Payroll', payrollSchema)