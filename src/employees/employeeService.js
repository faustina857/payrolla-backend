const Employee = require('./employeeModel')
const User = require('../auth/authModel')
const { sendEmail, emailTemplates } = require('../utils/email')
const crypto = require('crypto')
const Loan = require('../loans/loanModel')
const { createAuditLog } = require('../audit/auditService')

// Generate Employee ID
const generateEmployeeId = async () => {
  const count = await Employee.countDocuments()
  const padded = String(count + 1).padStart(4, '0')
  return `PR-${padded}`
}

// Add Employee
const addEmployee = async (data, userId) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    address,
    departmentId,
    jobTitle,
    employmentType,
    startDate,
    gradeLevel,
    salary,
    bankDetails,
    taxIdentificationNumber,
    pensionFundAdministrator,
    pensionPin,
  } = data

  // check if employee email already exists
  const existingEmployee = await Employee.findOne({ email })
  if (existingEmployee) {
    const error = new Error('An employee with this email already exists')
    error.statusCode = 400
    throw error
  }

  // check if phone number already exists
  const existingPhone = await Employee.findOne({ phone })
  if (existingPhone) {
    const error = new Error('An employee with this phone number already exists')
    error.statusCode = 400
    throw error
  }

  // generate unique employee ID
  const employeeId = await generateEmployeeId()

  // create employee record
  const employee = await Employee.create({
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    address,
    employeeId,
    departmentId,
    jobTitle,
    employmentType,
    startDate,
    gradeLevel,
    salary,
    bankDetails,
    taxIdentificationNumber,
    pensionFundAdministrator,
    pensionPin,
  })

  // create user account for employee
  // generate a temporary password
  const tempPassword = crypto.randomBytes(8).toString('hex')

  // generate invite token
  const inviteToken = crypto.randomBytes(32).toString('hex')
  const hashedInviteToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex')

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: tempPassword,
    role: data.role || 'employee',
    employeeId: employee._id,
    inviteToken: hashedInviteToken,
    inviteTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })

  // link user to employee
  employee.userId = user._id
  await employee.save()

  // send invite email
  const inviteUrl = `${process.env.CLIENT_URL}/accept-invite/${inviteToken}`
  const template = emailTemplates.inviteEmployee(inviteUrl, firstName)

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  })

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_CREATED',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) was added to the system`,
  })

  return employee
}

// Get All Employees
const getAllEmployees = async (query) => {
  const {
    page = 1,
    limit = 10,
    search,
    department,
    status,
    employmentType,
  } = query

  // build filter object
  const filter = {}

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ]
  }

  if (department) filter.departmentId = department
  if (status) filter.employmentStatus = status
  if (employmentType) filter.employmentType = employmentType

  const skip = (page - 1) * limit

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('departmentId', 'name')
      .select('-bankDetails -taxIdentificationNumber -pensionPin')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Employee.countDocuments(filter),
  ])

  return {
    employees,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }
}

// Get One Employee
const getEmployee = async (id) => {
  const employee = await Employee.findById(id)
    .populate('departmentId', 'name')
    .populate('userId', 'email role status lastLogin')

  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  return employee
}

// Get Own Profile
const getMyProfile = async (userId) => {
  const employee = await Employee.findOne({ userId })
    .populate('departmentId', 'name')

  if (!employee) {
    const error = new Error('Employee profile not found')
    error.statusCode = 404
    throw error
  }

  // fetch active loan for employee if any
  const activeLoan = await Loan.findOne({
    employeeId: employee._id,
    status: 'active',
  }).select(
    'loanType totalAmount monthlyDeduction outstandingBalance numberOfInstallments installmentsPaid expectedEndDate startDate'
  )

  return {
    ...employee.toObject(),
    activeLoan: activeLoan || null,
  }

}

// Update Employee (HR/Admin)
const updateEmployee = async (id, data, userId) => {
  const employee = await Employee.findById(id)

  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  // prevent updating terminated employees
  if (employee.employmentStatus === 'terminated') {
    const error = new Error('Cannot update a terminated employee')
    error.statusCode = 400
    throw error
  }

  const updatedEmployee = await Employee.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  ).populate('departmentId', 'name')

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_UPDATED',
    module: 'employees',
    resourceId: updatedEmployee._id,
    description: `Employee ${updatedEmployee.firstName} ${updatedEmployee.lastName} profile was updated`,
    changes: {
      before: null, 
      after: data,
    },
})

  return updatedEmployee
}

// Update Own Profile (Employee)
const updateMyProfile = async (userId, data) => {
  const employee = await Employee.findOneAndUpdate(
    { userId },
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  ).populate('departmentId', 'name')

  if (!employee) {
    const error = new Error('Employee profile not found')
    error.statusCode = 404
    throw error
  }

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_UPDATED',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} updated their own profile`,
  })

  return employee
}

// Terminate Employee
const terminateEmployee = async (id, data, userId) => {
  const { reason, endDate } = data

  const employee = await Employee.findById(id)

  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  if (employee.employmentStatus === 'terminated') {
    const error = new Error('Employee is already terminated')
    error.statusCode = 400
    throw error
  }

  // soft delete — update status and end date
  employee.employmentStatus = 'terminated'
  employee.endDate = endDate || new Date()
  employee.terminationReason = reason
  await employee.save()

  // deactivate their user account
  await User.findByIdAndUpdate(employee.userId, {
    status: 'terminated',
  })

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_TERMINATED',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} was terminated. Reason: ${reason}`,
  })

  return employee
}

// Suspend Employee
const suspendEmployee = async (id, data, userId) => {
  const { reason, suspensionEndDate } = data

  const employee = await Employee.findById(id)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  if (['terminated', 'inactive'].includes(employee.employmentStatus)) {
    const error = new Error(`Cannot suspend a ${employee.employmentStatus} employee`)
    error.statusCode = 400
    throw error
  }

  if (employee.employmentStatus === 'suspended') {
    const error = new Error('Employee is already suspended')
    error.statusCode = 400
    throw error
  }

  employee.employmentStatus = 'suspended'
  employee.suspensionReason = reason
  employee.suspensionEndDate = suspensionEndDate || null

  await employee.save()

  // deactivate user account during suspension
  await User.findByIdAndUpdate(employee.userId, { status: 'suspended' })

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_SUSPENDED',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} was suspended. Reason: ${reason}`,
  })

  return employee
}

// Activate Employee
const activateEmployee = async (id, data, userId) => {
  const { note } = data || {}

  const employee = await Employee.findById(id)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  if (employee.employmentStatus === 'terminated') {
    const error = new Error('Cannot reactivate a terminated employee')
    error.statusCode = 400
    throw error
  }

  if (employee.employmentStatus === 'active') {
    const error = new Error('Employee is already active')
    error.statusCode = 400
    throw error
  }

  employee.employmentStatus = 'active'
  employee.suspensionReason = null
  employee.suspensionEndDate = null
  employee.leaveType = null
  employee.leaveStartDate = null
  employee.leaveEndDate = null
  employee.leaveReason = null

  await employee.save()

  // reactivate user account
  await User.findByIdAndUpdate(employee.userId, { status: 'active' })

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_ACTIVATED',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} was reactivated`,
  })

  return employee
}

// Put Employee On Leave
const putEmployeeOnLeave = async (id, data, userId) => {
  const { type, startDate, endDate, reason } = data

  const employee = await Employee.findById(id)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  if (['terminated', 'suspended', 'inactive'].includes(employee.employmentStatus)) {
    const error = new Error(`Cannot put a ${employee.employmentStatus} employee on leave`)
    error.statusCode = 400
    throw error
  }

  if (employee.employmentStatus === 'onLeave') {
    const error = new Error('Employee is already on leave')
    error.statusCode = 400
    throw error
  }

  employee.employmentStatus = 'onLeave'
  employee.leaveType = type
  employee.leaveStartDate = startDate
  employee.leaveEndDate = endDate
  employee.leaveReason = reason || null

  await employee.save()

  await createAuditLog({
    performedBy: userId,
    action: 'EMPLOYEE_ON_LEAVE',
    module: 'employees',
    resourceId: employee._id,
    description: `Employee ${employee.firstName} ${employee.lastName} was put on ${type} leave`,
  })

  return employee
}

module.exports = {
  addEmployee,
  getAllEmployees,
  getEmployee,
  getMyProfile,
  updateEmployee,
  updateMyProfile,
  terminateEmployee,
  suspendEmployee,
  activateEmployee,
  putEmployeeOnLeave
}