const Joi = require('joi')

const loanValidation = {
  // ─── Create Loan ───────────────────────────────────────
  create: Joi.object({
    employeeId: Joi.string().required().messages({
      'string.empty': 'Employee is required',
      'any.required': 'Employee is required',
    }),
    loanType: Joi.string()
      .valid('salaryAdvance', 'personalLoan', 'emergencyLoan')
      .required()
      .messages({
        'any.only': 'Invalid loan type',
        'any.required': 'Loan type is required',
      }),
    totalAmount: Joi.number().min(1000).required().messages({
      'number.min': 'Minimum loan amount is ₦1,000',
      'any.required': 'Total loan amount is required',
    }),
    monthlyDeduction: Joi.number().min(100).required().messages({
      'number.min': 'Minimum monthly deduction is ₦100',
      'any.required': 'Monthly deduction amount is required',
    }),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
    }),
    notes: Joi.string().trim().optional(),
  }),

  // ─── Update Loan ───────────────────────────────────────
  update: Joi.object({
    monthlyDeduction: Joi.number().min(100).optional().messages({
      'number.min': 'Minimum monthly deduction is ₦100',
    }),
    startDate: Joi.date().optional(),
    notes: Joi.string().trim().optional(),
  }),

  // ─── Approve Loan ──────────────────────────────────────
  approve: Joi.object({
    notes: Joi.string().trim().optional(),
  }),

  // ─── Cancel Loan ───────────────────────────────────────
  cancel: Joi.object({
    reason: Joi.string().trim().required().messages({
      'string.empty': 'Cancellation reason is required',
      'any.required': 'Cancellation reason is required',
    }),
  }),
}

module.exports = loanValidation