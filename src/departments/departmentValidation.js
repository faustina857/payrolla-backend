const Joi = require('joi')

const departmentValidation = {
  // ─── Create Department ─────────────────────────────────
  create: Joi.object({
    name: Joi.string().required().min(2).max(100).messages({
      'string.empty': 'Department name is required',
    }),
    description: Joi.string().max(100).optional(),
    hodId: Joi.string().optional(), // can be assigned later
  }),
  // ─── Update Department ─────────────────────────────────
  update: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.empty': 'Department name is required',
    }),
    description: Joi.string().max(100).optional(),
    hodId: Joi.string().optional(), // can be assigned later
  })
}

module.exports = departmentValidation