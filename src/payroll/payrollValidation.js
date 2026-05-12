const Joi = require('joi')

const payrollValidation = {
  // ─── Create Payroll Run ───────────────────────────────
  create: Joi.object({
    month: Joi.number().min(1).max(12).required().messages({
      'number.min': 'Month must be between 1 and 12',
      'number.max': 'Month must be between 1 and 12',
      'any.required': 'Month is required',
    }),
    year: Joi.number().min(2000).max(2100).required().messages({
      'number.min': 'Year must be from 2000 onwards',
      'number.max': 'Invalid year',
      'any.required': 'Year is required',
    }),
    notes: Joi.string().trim().optional(),
  }),

  update: Joi.object({
    month: Joi.number().min(1).max(12).optional().messages({
      'number.min': 'Month must be between 1 and 12',
      'number.max': 'Month must be between 1 and 12',
    }),
    year: Joi.number().min(2000).max(2100).optional().messages({
      'number.min': 'Year must be from 2000 onwards',
      'number.max': 'Invalid year',
    }),
    notes: Joi.string().trim().optional(),
  }),

  // ─── Submit Payroll Run ───────────────────────────────
  submit: Joi.object({
    notes: Joi.string().trim().optional(),
  }),

  // ─── Approve Payroll Run ──────────────────────────────
  approve: Joi.object({
    notes: Joi.string().trim().optional(),
  }),

  // ─── Cancel Payroll Run ───────────────────────────────
  cancel: Joi.object({
    reason: Joi.string().trim().required().messages({
      'string.empty': 'Cancellation reason is required',
      'any.required': 'Cancellation reason is required',
    }),
  }),
}

module.exports = payrollValidation