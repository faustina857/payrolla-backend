const Joi = require('joi')

const employeeValidation = {
  // Create Employee
  create: Joi.object({
    // personal info
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
    phone: Joi.string().pattern(/^(\+234|234|0)[789][01]\d{8}$/).required()
    .messages({
      'string.pattern.base': 'Please provide a valid Nigerian phone number',
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
    }),
    dateOfBirth: Joi.date().required().messages({
      'any.required': 'Date of birth is required',
    }),
    gender: Joi.string().valid('male', 'female', 'other').required().messages({
      'any.only': 'Gender must be male, female or other',
      'any.required': 'Gender is required',
    }),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      country: Joi.string().trim().default('Nigeria'),
    }).optional(),

    // job info
    role: Joi.string().valid('admin', 'hr', 'employee')
    .default('employee').optional(),
    departmentId: Joi.string().required().messages({
      'string.empty': 'Department is required',
      'any.required': 'Department is required',
    }),
    jobTitle: Joi.string().trim().required().messages({
      'string.empty': 'Job title is required',
      'any.required': 'Job title is required',
    }),
    employmentType: Joi.string()
      .valid('fullTime', 'partTime', 'contract', 'intern')
      .required()
      .messages({
        'any.only': 'Invalid employment type',
        'any.required': 'Employment type is required',
      }),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
    }),
    gradeLevel: Joi.string().trim().optional(),

    // salary structure
    salary: Joi.object({
      basicSalary: Joi.number().min(0).required().messages({
        'number.min': 'Basic salary cannot be negative',
        'any.required': 'Basic salary is required',
      }),
      housing: Joi.number().min(0).default(0),
      transport: Joi.number().min(0).default(0),
      meal: Joi.number().min(0).default(0),
      utility: Joi.number().min(0).default(0),
    }).required().messages({
      'any.required': 'Salary structure is required',
    }),

    // bank details
    bankDetails: Joi.object({
      bankName: Joi.string().trim().required().messages({
        'string.empty': 'Bank name is required',
        'any.required': 'Bank name is required',
      }),

      accountNumber: Joi.string().pattern(/^\d{10}$/).required().messages({
        'string.pattern.base': 'Account number must be exactly 10 digits',
        'string.empty': 'Account number is required',
        'any.required': 'Account number is required',
      }),
      accountName: Joi.string().trim().required().messages({
        'string.empty': 'Account name is required',
        'any.required': 'Account name is required',
      }),
    }).optional(),

    // tax & pension
    taxIdentificationNumber: Joi.string().trim().optional(),
    pensionFundAdministrator: Joi.string().trim().optional(),
    pensionPin: Joi.string().trim().optional(),
  }),

  // Update Employee (HR/Admin)
  update: Joi.object({
    firstName: Joi.string().trim().optional(),
    lastName: Joi.string().trim().optional(),
    phone: Joi.string().pattern(/^(\+234|234|0)[789][01]\d{8}$/).optional()
    .messages({
      'string.pattern.base': 'Please provide a valid Nigerian phone number',
    }),
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      country: Joi.string().trim().optional(),
    }).optional(),
    departmentId: Joi.string().optional(),
    jobTitle: Joi.string().trim().optional(),
    employmentType: Joi.string()
      .valid('fullTime', 'partTime', 'contract', 'intern')
      .optional(),
    gradeLevel: Joi.string().trim().optional(),
    salary: Joi.object({
      basicSalary: Joi.number().min(0).optional(),
      housing: Joi.number().min(0).optional(),
      transport: Joi.number().min(0).optional(),
      meal: Joi.number().min(0).optional(),
      utility: Joi.number().min(0).optional(),
    }).optional(),
    bankDetails: Joi.object({
      bankName: Joi.string().trim().optional(),
      accountNumber: Joi.string().pattern(/^\d{10}$/).optional().messages({
        'string.pattern.base': 'Account number must be exactly 10 digits',
      }),
      accountName: Joi.string().trim().optional(),
    }).optional(),
    taxIdentificationNumber: Joi.string().trim().optional(),
    pensionFundAdministrator: Joi.string().trim().optional(),
    pensionPin: Joi.string().trim().optional(),
  }),

  // Update Own Profile (Employee)
  updateMe: Joi.object({
    phone: Joi.string().trim().optional(),
    address: Joi.object({
      street: Joi.string().trim().optional(),
      city: Joi.string().trim().optional(),
      state: Joi.string().trim().optional(),
      country: Joi.string().trim().optional(),
    }).optional(),
    profilePhoto: Joi.string().trim().optional(),
  }),

  // Terminate Employee
  terminate: Joi.object({
    reason: Joi.string().trim().required().messages({
      'string.empty': 'Termination reason is required',
      'any.required': 'Termination reason is required',
    }),
    endDate: Joi.date().optional(),
  }),
  suspend: Joi.object({
    reason: Joi.string().trim().required().messages({
      'string.empty': 'Suspension reason is required',
      'any.required': 'Suspension reason is required',
    }),
    suspensionEndDate: Joi.date().optional(),
  }),

  activate: Joi.object({
    note: Joi.string().trim().optional(),
  }),

  leave: Joi.object({
    type: Joi.string()
      .valid('annual', 'sick', 'maternity', 'paternity', 'unpaid')
      .required()
      .messages({
        'any.only': 'Invalid leave type',
        'any.required': 'Leave type is required',
      }),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
    }),
    endDate: Joi.date().required().messages({
      'any.required': 'End date is required',
    }),
    reason: Joi.string().trim().optional(),
  })
}

module.exports = employeeValidation