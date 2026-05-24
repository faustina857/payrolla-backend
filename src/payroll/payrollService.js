const mongoose = require('mongoose')
const Payroll = require('./payrollModel')
const Payslip = require('../payslips/payslipModel')
const Employee = require('../employees/employeeModel')
const { calculateDeductions, getProRateFactor } = require('../utils/payeCalculator')
const { sendEmail, emailTemplates } = require('../utils/email')
const { processLoanDeduction } = require('../loans/loanService')
const Loan = require('../loans/loanModel')
const { createAuditLog } = require('../audit/auditService')

// Create Payroll Run
const createPayrollRun = async (data, userId) => {
  const { month, year } = data

  // validate month and year — no future payroll runs
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  if (
    year > currentYear ||
    (year === currentYear && month > currentMonth)
  ) {
    const error = new Error('Cannot create a payroll run for a future period')
    error.statusCode = 400
    throw error
  }

  // generate period string e.g 'November 2025'
  const period = new Date(year, month - 1)
    .toLocaleString('en-NG', { month: 'long', year: 'numeric' })

  // check if payroll run already exists for this period
  const existingRun = await Payroll.findOne({ month, year })
  if (existingRun) {
    const error = new Error(`Payroll run for ${period} already exists`)
    error.statusCode = 400
    throw error
  }

  // get all active employees
  const employees = await Employee.find({
    employmentStatus: 'active',
    startDate: { $lte: new Date(year, month, 0) }
  }).populate('departmentId', 'name')

  if (employees.length === 0) {
    const error = new Error('No active employees found to process payroll')
    error.statusCode = 400
    throw error
  }

  // check all employees have complete salary structure
  const invalidEmployees = employees.filter(
    (emp) =>
      !emp.salary || !emp.salary.basicSalary || emp.salary.basicSalary <= 0
  )

  if (invalidEmployees.length > 0) {
    const names = invalidEmployees
      .map((e) => `${e.firstName} ${e.lastName}`)
      .join(', ')
    const error = new Error(
      `These employees have incomplete salary structure: ${names}`
    )
    error.statusCode = 400
    throw error
  }

  // calculate summary totals
  let totalGrossSalary = 0
  let totalDeductions = 0
  let totalNetSalary = 0
  let totalPaye = 0
  let totalPension = 0
  let totalEmployerPension = 0
  let totalNhf = 0

  // calculate deductions for each employee
  employees.forEach((employee) => {
    const proRateFactor = getProRateFactor(employee, month, year)
    const calculations = calculateDeductions(employee, 0, proRateFactor)

    totalGrossSalary += calculations.grossSalary
    totalDeductions += calculations.deductions.totalDeductions
    totalNetSalary += calculations.netSalary
    totalPaye += calculations.deductions.paye
    totalPension += calculations.deductions.employeePension
    totalEmployerPension += calculations.employerContributions.employerPension
    totalNhf += calculations.deductions.nhf
  })

  // create payroll run
  const payroll = await Payroll.create({
    month,
    year,
    period,
    status: 'draft',
    createdBy: userId,
    summary: {
      totalEmployees: employees.length,
      totalGrossSalary: Math.round(totalGrossSalary),
      totalDeductions: Math.round(totalDeductions),
      totalNetSalary: Math.round(totalNetSalary),
      totalPaye: Math.round(totalPaye),
      totalPension: Math.round(totalPension),
      totalEmployerPension: Math.round(totalEmployerPension),
      totalNhf: Math.round(totalNhf),
    },
  })

  await createAuditLog({
    performedBy: userId,
    action: 'PAYROLL_CREATED',
    module: 'payroll',
    resourceId: payroll._id,
    description: `Payroll run for ${payroll.period} was created`,
  })

  return payroll
}

// Get All Payroll Runs
const getAllPayrollRuns = async (query) => {
  const { page = 1, limit = 10, status, year } = query

  const filter = {}
  if (status) filter.status = status
  if (year) filter.year = Number(year)

  const skip = (page - 1) * limit

  const [payrolls, total] = await Promise.all([
    Payroll.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Payroll.countDocuments(filter),
  ])

  return {
    payrolls,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }
}

// Get One Payroll Run
const getPayrollRun = async (id) => {
  const payroll = await Payroll.findById(id)
    .populate('createdBy', 'firstName lastName email')
    .populate('approvedBy', 'firstName lastName email')
    .populate('paidBy', 'firstName lastName email')

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  return payroll
}

// Submit Payroll Run
const submitPayrollRun = async (id, userId, data) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status !== 'draft') {
    const error = new Error(`Cannot submit a payroll run with status: ${payroll.status}`)
    error.statusCode = 400
    throw error
  }

  // check that the person submitting is the one who created it
  if (payroll.createdBy.toString() !== userId.toString()) {
    const error = new Error('Only the creator can submit this payroll run')
    error.statusCode = 403
    throw error
  }

  payroll.status = 'pending'
  payroll.submissionNotes = data?.notes || null
  await payroll.save()

  await createAuditLog({
    performedBy: userId,
    action: 'PAYROLL_SUBMITTED',
    module: 'payroll',
    resourceId: payroll._id,
    description: `Payroll run for ${payroll.period} was submitted for approval`,
  })

  return payroll
}

// Approve Payroll Run
const approvePayrollRun = async (id, userId, userRole, data) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status !== 'pending') {
    const error = new Error(`Cannot approve a payroll run with status: ${payroll.status}`)
    error.statusCode = 400
    throw error
  }

  // creator cannot approve their own payroll run
  // EXCEPT superAdmin — they have full authority
  if (payroll.createdBy.toString() === userId.toString() && userRole !== 'superAdmin') {
    const error = new Error('You cannot approve a payroll run you created')
    error.statusCode = 403
    throw error
  }

  payroll.status = 'approved'
  payroll.approvedBy = userId
  payroll.approvedAt = new Date()
  payroll.approvalNotes = data?.notes || null
  await payroll.save()

  await createAuditLog({
    performedBy: userId,
    action: 'PAYROLL_APPROVED',
    module: 'payroll',
    resourceId: payroll._id,
    description: `Payroll run for ${payroll.period} was approved`,
  })
  return payroll
}

// Mark Payroll As Paid
const markAsPaid = async (id, userId) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  let createdPayslips = []
  let payroll

  try {
    payroll = await Payroll.findById(id).session(session)

    if (!payroll) {
      const error = new Error('Payroll run not found')
      error.statusCode = 404
      throw error
    }

    if (payroll.status !== 'approved') {
      const error = new Error(
        `Cannot mark as paid a payroll run with status: ${payroll.status}`
      )
      error.statusCode = 400
      throw error
    }

    // check no payslips already exist
    const existingPayslips = await Payslip.findOne({
      payrollId: id,
    }).session(session)

    if (existingPayslips) {
      const error = new Error(
        'Payslips have already been generated for this payroll run'
      )
      error.statusCode = 400
      throw error
    }

    // get all active employees
    const employees = await Employee.find({
      employmentStatus: 'active',
      startDate: { $lte: new Date(payroll.year, payroll.month, 0) }
    })
      .populate('departmentId', 'name')
      .session(session)

    if (employees.length === 0) {
      const error = new Error('No active employees found')
      error.statusCode = 400
      throw error
    }

    // check all employees have bank details
    const employeesWithoutBankDetails = employees.filter(
      (emp) => !emp.bankDetails?.accountNumber || !emp.bankDetails?.bankName
    )

    if (employeesWithoutBankDetails.length > 0) {
      const names = employeesWithoutBankDetails
        .map((e) => `${e.firstName} ${e.lastName}`)
        .join(', ')
      const error = new Error(
        `These employees have no bank details: ${names}`
      )
      error.statusCode = 400
      throw error
    }

    // mark payroll as paid
    payroll.status = 'paid'
    payroll.paidBy = userId
    payroll.paidAt = new Date()
    payroll.payDate = new Date()
    await payroll.save({ session })

    // generate payslips
    const payslipPromises = employees.map(async (employee) => {
       // process loan deduction for this employee
      const loanRepayment = await processLoanDeduction(
        employee._id,
        session
      )

      // calculate pro-rate factor
      const proRateFactor = getProRateFactor(
        employee,
        payroll.month,
        payroll.year
      )
      const calculations = calculateDeductions(employee, loanRepayment, proRateFactor)

      const payslip = await Payslip.create(
        [
          {
            employeeId: employee._id,
            payrollId: payroll._id,
            period: payroll.period,
            payDate: new Date(),
            employeeSnapshot: {
              firstName: employee.firstName,
              lastName: employee.lastName,
              email: employee.email,
              jobTitle: employee.jobTitle,
              department: employee.departmentId?.name,
              employeeId: employee.employeeId,
              bankName: employee.bankDetails?.bankName,
              accountNumber: employee.bankDetails?.accountNumber,
              accountName: employee.bankDetails?.accountName,
              taxIdentificationNumber: employee.taxIdentificationNumber,
              pensionPin: employee.pensionPin,
            },
            earnings: {
              ...calculations.earnings,
              grossSalary: calculations.grossSalary,
            },
            deductions: calculations.deductions,
            employerContributions: calculations.employerContributions,
            netSalary: calculations.netSalary,
            isProRated: calculations.isProRated,
            proRateFactor: calculations.proRateFactor,
            status: 'generated',
            emailSent: false,
          },
        ],
        { session }
      )

      return { payslip: payslip[0], employee }
    })

    createdPayslips = await Promise.all(payslipPromises)

    // commit transaction
    await session.commitTransaction()
    session.endSession()

  } catch (error) {
    // only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    session.endSession()
    throw error
  }

  // send emails completely outside transaction──
  for (const { payslip, employee } of createdPayslips) {
    const template = emailTemplates.payslipNotification(
      employee.firstName,
      payroll.period,
      payslip
    )

    try {
      await sendEmail({
        to: employee.email,
        subject: template.subject,
        html: template.html,
      })

      await Payslip.findByIdAndUpdate(payslip._id, {
        emailSent: true,
        emailSentAt: new Date(),
        status: 'sent',
      })
    } catch (emailError) {
      console.error(
        `Failed to send email to ${employee.email}: ${emailError.message}`
      )
    }
  }

  await createAuditLog({
    performedBy: userId,
    action: 'PAYROLL_PAID',
    module: 'payroll',
    resourceId: payroll._id,
    description: `Payroll run for ${payroll.period} was marked as paid. ${createdPayslips.length} payslips generated.`,
  })

  return payroll
}

// Cancel Payroll Run
const cancelPayrollRun = async (id, data, userId) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status === 'paid') {
    const error = new Error('Cannot cancel a payroll run that has already been paid')
    error.statusCode = 400
    throw error
  }

  if (payroll.status === 'cancelled') {
    const error = new Error('Payroll run is already cancelled')
    error.statusCode = 400
    throw error
  }

  payroll.status = 'cancelled'
  payroll.cancellationReason = data?.reason || null
  await payroll.save()

  await createAuditLog({
    performedBy: userId,
    action: 'PAYROLL_CANCELLED',
    module: 'payroll',
    resourceId: payroll._id,
    description: `Payroll run for ${payroll.period} was cancelled. Reason: ${data.reason}`,
  })

  return payroll
}

// Update Draft Payroll Run
const updatePayrollRun = async (id, data) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status !== 'draft') {
    const error = new Error('Can only edit a draft payroll run')
    error.statusCode = 400
    throw error
  }

  // if month or year is being updated regenerate period string
  if (data.month || data.year) {
    const month = data.month || payroll.month
    const year = data.year || payroll.year

    // validate no future runs
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    if (
      year > currentYear ||
      (year === currentYear && month > currentMonth)
    ) {
      const error = new Error('Cannot set a future period for payroll run')
      error.statusCode = 400
      throw error
    }

    // check no duplicate period
    const existingRun = await Payroll.findOne({
      month,
      year,
      _id: { $ne: id }, // exclude current run
    })

    if (existingRun) {
      const period = new Date(year, month - 1).toLocaleString('en-NG', {
        month: 'long',
        year: 'numeric',
      })
      const error = new Error(`Payroll run for ${period} already exists`)
      error.statusCode = 400
      throw error
    }

    // regenerate period string
    data.period = new Date(year, month - 1).toLocaleString('en-NG', {
      month: 'long',
      year: 'numeric',
    })
  }

  const updatedPayroll = await Payroll.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  )

  return updatedPayroll
}

// Payroll Preview
const getPayrollPreview = async (id) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status === 'paid') {
    const error = new Error('This payroll run has already been paid. View payslips instead.')
    error.statusCode = 400
    throw error
  }

  // get all active employees
  const employees = await Employee.find({
    employmentStatus: 'active',
  }).populate('departmentId', 'name')

  if (employees.length === 0) {
    const error = new Error('No active employees found')
    error.statusCode = 400
    throw error
  }

  // calculate each employee's breakdown
  const breakdown = await Promise.all(
  employees.map(async (employee) => {
    // check if employee has active loan
    const activeLoan = await Loan.findOne({
      employeeId: employee._id,
      status: 'active',
    })

    const loanRepayment = activeLoan
      ? Math.min(activeLoan.monthlyDeduction, activeLoan.outstandingBalance)
      : 0

    // calculate pro-rate factor
    const proRateFactor = getProRateFactor(
      employee,
      payroll.month,
      payroll.year
    )

    const calculations = calculateDeductions(employee, loanRepayment, proRateFactor)

    return {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.departmentId?.name,
      jobTitle: employee.jobTitle,
      isProRated: calculations.isProRated,
      proRateFactor: calculations.proRateFactor,
      earnings: {
        basicSalary: employee.salary.basicSalary,
        housing: employee.salary.housing,
        transport: employee.salary.transport,
        meal: employee.salary.meal,
        utility: employee.salary.utility,
        grossSalary: calculations.grossSalary,
      },
      deductions: {
        paye: calculations.deductions.paye,
        employeePension: calculations.deductions.employeePension,
        nhf: calculations.deductions.nhf,
        loanRepayment: calculations.deductions.loanRepayment,
        totalDeductions: calculations.deductions.totalDeductions,
      },
      employerContributions: {
        employerPension: calculations.employerContributions.employerPension,
      },
      netSalary: calculations.netSalary,
      hasActiveLoan: !!activeLoan,
    }
  })
 )
  return {
    payroll: {
      _id: payroll._id,
      period: payroll.period,
      status: payroll.status,
      summary: payroll.summary,
    },
    breakdown,
    totalEmployees: employees.length,
  }
}

// Generate Payment File
const generatePaymentFile = async (id) => {
  const payroll = await Payroll.findById(id)

  if (!payroll) {
    const error = new Error('Payroll run not found')
    error.statusCode = 404
    throw error
  }

  if (payroll.status !== 'approved' && payroll.status !== 'paid') {
    const error = new Error('Payment file can only be generated for approved or paid payroll runs')
    error.statusCode = 400
    throw error
  }

  // get all active employees and calculate
  const employees = await Employee.find({
    employmentStatus: 'active',
  })

  const rows = employees.map((employee) => {
    const proRateFactor = getProRateFactor(
      employee,
      payroll.month,
      payroll.year
    )
    const calculations = calculateDeductions(employee, 0, proRateFactor)
    return {
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      bankName: employee.bankDetails?.bankName || '',
      accountNumber: employee.bankDetails?.accountNumber || '',
      accountName: employee.bankDetails?.accountName || '',
      netSalary: calculations.netSalary,
      period: payroll.period,
    }
  })

  // build CSV
  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Bank Name',
    'Account Number',
    'Account Name',
    'Net Salary',
    'Period',
  ].join(',')

  const csvRows = rows.map((row) =>
    Object.values(row).join(',')
  )

  const csv = [headers, ...csvRows].join('\n')

  return { csv, period: payroll.period }
}

module.exports = {
  createPayrollRun,
  getAllPayrollRuns,
  getPayrollRun,
  getPayrollPreview,
  updatePayrollRun,
  submitPayrollRun,
  approvePayrollRun,
  markAsPaid,
  cancelPayrollRun,
  generatePaymentFile,
}