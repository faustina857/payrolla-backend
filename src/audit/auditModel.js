const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // snapshot of user at the time of action
    userSnapshot: {
      firstName: String,
      lastName: String,
      email: String,
      role: String,
    },

    //  What They Did 
    action: {
      type: String,
      required: true,
      enum: [
        // auth actions
        'LOGIN',
        'LOGOUT',
        'PASSWORD_RESET',
        'PASSWORD_CHANGED',
        // employee actions
        'EMPLOYEE_CREATED',
        'EMPLOYEE_UPDATED',
        'EMPLOYEE_TERMINATED',
        'EMPLOYEE_SUSPENDED',
        'EMPLOYEE_ACTIVATED',
        'EMPLOYEE_ON_LEAVE',
        // department actions
        'DEPARTMENT_CREATED',
        'DEPARTMENT_UPDATED',
        'DEPARTMENT_DEACTIVATED',
        // payroll actions
        'PAYROLL_CREATED',
        'PAYROLL_SUBMITTED',
        'PAYROLL_APPROVED',
        'PAYROLL_PAID',
        'PAYROLL_CANCELLED',
        // loans
        'LOAN_CREATED',
        'LOAN_UPDATED',
        'LOAN_APPROVED',
        'LOAN_CANCELLED',
        // payslip actions
        'PAYSLIP_GENERATED',
        'PAYSLIP_SENT',
        'PAYSLIP_EMAIL_RESENT',
      ],
    },

    //  What It Affected 
    // which collection was affected
    module: {
      type: String,
      required: true,
      enum: [
        'auth',
        'employees',
        'departments',
        'payroll',
        'payslips',
        'loans',
      ],
    },
    // the specific record that was affected
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // e.g the employee _id that was updated
    },

    //  Details 
    description: {
      type: String,
      required: true,
      trim: true,
      // e.g 'HR officer Funke approved November 2025 payroll run'
    },
    // stores what changed — old value vs new value
    changes: {
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },

    //  Request Info
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('AuditLog', auditLogSchema)