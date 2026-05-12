const mongoose = require('mongoose')

const payslipSchema = new mongoose.Schema(
  {
    // ─── References ───────────────────────────────────────────
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: [true, 'Payroll run is required'],
    },
    // human readable period e.g 'November 2025'
    period: {
      type: String,
      required: [true, 'Period is required'],
      trim: true,
    },
    payDate: {
      type: Date,
      default: null,
    },

    // ─── Snapshot of Employee at This Point in Time ───────────
    // stored directly so payslip stays accurate even if
    // employee details change later
    employeeSnapshot: {
      firstName: String,
      lastName: String,
      email: String,
      jobTitle: String,
      department: String,
      employeeId: String, // human readable ID e.g PR-0041
      bankName: String,
      accountNumber: String,
      accountName: String,
      taxIdentificationNumber: String,
      pensionPin: String,
    },

    // ─── Earnings ─────────────────────────────────────────────
    earnings: {
      basicSalary: {
        type: Number,
        required: true,
        default: 0,
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
      grossSalary: {
        type: Number,
        required: true,
        default: 0, // sum of all earnings
      },
    },

    // ─── Deductions ───────────────────────────────────────────
    deductions: {
      paye: {
        type: Number,
        default: 0, // calculated from PAYE bands
      },
      employeePension: {
        type: Number,
        default: 0, // 8% of basic salary
      },
      nhf: {
        type: Number,
        default: 0, // 2.5% of basic salary
      },
      loanRepayment: {
        type: Number,
        default: 0,
      },
      otherDeductions: {
        type: Number,
        default: 0,
      },
      totalDeductions: {
        type: Number,
        default: 0, // sum of all deductions
      },
    },

    // ─── Employer Contributions ───────────────────────────────
    // not deducted from employee — paid by company
    employerContributions: {
      employerPension: {
        type: Number,
        default: 0, // 10% of basic salary
      },
    },

    // ─── Net Pay ──────────────────────────────────────────────
    netSalary: {
      type: Number,
      required: true,
      default: 0, // grossSalary - totalDeductions
    },

    // ─── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['generated', 'sent', 'viewed'],
      default: 'generated',
    },

    isProRated: {
      type: Boolean,
      default: false,
    },
    proRateFactor: {
      type: Number,
      default: 1,
    },

    // ─── Email Tracking ───────────────────────────────────────
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// one employee can only have one payslip per payroll run
payslipSchema.index({ employeeId: 1, payrollId: 1 }, { unique: true })

module.exports = mongoose.model('Payslip', payslipSchema)