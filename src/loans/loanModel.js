const mongoose = require('mongoose')

const loanSchema = new mongoose.Schema(
  {
    //  Employee Reference
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },

    //  Loan Details
    loanType: {
      type: String,
      enum: ['salaryAdvance', 'personalLoan', 'emergencyLoan'],
      required: [true, 'Loan type is required'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total loan amount is required'],
      min: [1000, 'Minimum loan amount is ₦1,000'],
    },
    monthlyDeduction: {
      type: Number,
      required: [true, 'Monthly deduction amount is required'],
      min: [100, 'Minimum monthly deduction is ₦100'],
    },
    outstandingBalance: {
      type: Number,
      required: true,
    },
    numberOfInstallments: {
      type: Number,
      required: true,
      // calculated: totalAmount / monthlyDeduction
    },
    installmentsPaid: {
      type: Number,
      default: 0,
    },

    //  Dates
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    expectedEndDate: {
      type: Date,
      // calculated: startDate + numberOfInstallments months
    },
    actualEndDate: {
      type: Date,
      default: null, // set when loan is completed
    },

    // Status 
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },

    //  Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    //  Notes
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Loan', loanSchema)