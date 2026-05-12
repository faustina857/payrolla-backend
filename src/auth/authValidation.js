const Joi = require('joi')

const authValidation = {
  register: Joi.object({
    firstName: Joi.string().trim().required().messages({
      'string.empty': 'First name is required',
      'any.required': 'First name is required',
    }),
    lastName: Joi.string().trim().required().messages({
      'string.empty': 'Last name is required',
      'any.required': 'Last name is required',
    }),
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your password',
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your password',
      }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'New password is required',
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your new password',
      }),
  }),

  acceptInvite: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Invite token is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your password',
      }),
  }),
}

module.exports = authValidation