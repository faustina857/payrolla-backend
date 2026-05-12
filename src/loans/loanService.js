const Loan = require('./loanModel')
const Employee = require('../employees/employeeModel')
const { createAuditLog } = require('../audit/auditService')

// ─── Create Loan ──────────────────────────────────────────
const createLoan = async (data, userId) => {
  const {
    employeeId,
    loanType,
    totalAmount,
    monthlyDeduction,
    startDate,
    notes,
  } = data

  // check employee exists
  const employee = await Employee.findById(employeeId)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  // check employee is active
  if (employee.employmentStatus !== 'active') {
    const error = new Error(
      `Cannot create a loan for a ${employee.employmentStatus} employee`
    )
    error.statusCode = 400
    throw error
  }

  // check employee has no other active or pending loans
  const existingLoan = await Loan.findOne({
    employeeId,
    status: { $in: ['active', 'pending'] },
  })

  if (existingLoan) {
    const error = new Error(
      'Employee already has an active or pending loan. Complete or cancel it before creating a new one.'
    )
    error.statusCode = 400
    throw error
  }

  // validate monthly deduction doesn't exceed total amount
  if (monthlyDeduction > totalAmount) {
    const error = new Error(
      'Monthly deduction cannot exceed total loan amount'
    )
    error.statusCode = 400
    throw error
  }

  // calculate number of installments
  const numberOfInstallments = Math.ceil(totalAmount / monthlyDeduction)

  // calculate expected end date
  const expectedEndDate = new Date(startDate)
  expectedEndDate.setMonth(
    expectedEndDate.getMonth() + numberOfInstallments
  )

  const loan = await Loan.create({
    employeeId,
    loanType,
    totalAmount,
    monthlyDeduction,
    outstandingBalance: totalAmount,
    numberOfInstallments,
    startDate,
    expectedEndDate,
    notes,
    status: 'pending',
  })

  await createAuditLog({
    performedBy: userId,
    action: 'LOAN_CREATED',
    module: 'loans',
    resourceId: loan._id,
    description: `${loanType} loan of ₦${totalAmount.toLocaleString()} created for employee ${employee.firstName} ${employee.lastName}`,
  })
  return loan
}

// ─── Get All Loans ────────────────────────────────────────
const getAllLoans = async (query) => {
  const { page = 1, limit = 10, status, employeeId } = query

  const filter = {}
  if (status) filter.status = status
  if (employeeId) filter.employeeId = employeeId

  const skip = (page - 1) * limit

  const [loans, total] = await Promise.all([
    Loan.find(filter)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Loan.countDocuments(filter),
  ])

  return {
    loans,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }
}

// ─── Get One Loan ─────────────────────────────────────────
const getLoan = async (id) => {
  const loan = await Loan.findById(id)
    .populate('employeeId', 'firstName lastName employeeId department')
    .populate('approvedBy', 'firstName lastName email')

  if (!loan) {
    const error = new Error('Loan not found')
    error.statusCode = 404
    throw error
  }

  return loan
}

// ─── Get Employee Loans ───────────────────────────────────
const getEmployeeLoans = async (userId) => {
  const employee = await Employee.findOne({ userId })
  if (!employee) {
    const error = new Error('Employee profile not found')
    error.statusCode = 404
    throw error
  }

  const loans = await Loan.find({ employeeId: employee._id })
    .sort({ createdAt: -1 })

  return loans
}

// ─── Update Loan ──────────────────────────────────────────
const updateLoan = async (id, data, userId) => {
  const loan = await Loan.findById(id)

  if (!loan) {
    const error = new Error('Loan not found')
    error.statusCode = 404
    throw error
  }

  if (loan.status !== 'pending') {
    const error = new Error('Can only update a pending loan')
    error.statusCode = 400
    throw error
  }

  // recalculate if monthly deduction changes
  if (data.monthlyDeduction) {
    data.numberOfInstallments = Math.ceil(
      loan.totalAmount / data.monthlyDeduction
    )

    const startDate = data.startDate || loan.startDate
    const expectedEndDate = new Date(startDate)
    expectedEndDate.setMonth(
      expectedEndDate.getMonth() + data.numberOfInstallments
    )
    data.expectedEndDate = expectedEndDate
  }

  const updatedLoan = await Loan.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  )

  await createAuditLog({
    performedBy: userId,
    action: 'LOAN_UPDATED',
    module: 'loans',
    resourceId: updatedLoan._id,
    description: `Loan for employee was updated`,
    changes: {
        before: null,
        after: data,
    },
  })

  return updatedLoan
}

// ─── Approve Loan ─────────────────────────────────────────
const approveLoan = async (id, userId, data) => {
  const loan = await Loan.findById(id)

  if (!loan) {
    const error = new Error('Loan not found')
    error.statusCode = 404
    throw error
  }

  if (loan.status !== 'pending') {
    const error = new Error(
      `Cannot approve a loan with status: ${loan.status}`
    )
    error.statusCode = 400
    throw error
  }
  const employee = await Employee.findById(loan.employeeId)

  loan.status = 'active'
  loan.approvedBy = userId
  loan.approvedAt = new Date()
  if (data?.notes) loan.notes = data.notes
  await loan.save()

  await createAuditLog({
    performedBy: userId,
    action: 'LOAN_APPROVED',
    module: 'loans',
    resourceId: loan._id,
    description: `${loan.loanType} loan of ₦${loan.totalAmount.toLocaleString()} approved for ${employee.firstName} ${employee.lastName}`,
  })

  return loan
}

// ─── Cancel Loan ──────────────────────────────────────────
const cancelLoan = async (id, data, userId) => {
  const loan = await Loan.findById(id)

  if (!loan) {
    const error = new Error('Loan not found')
    error.statusCode = 404
    throw error
  }

  if (loan.status === 'completed') {
    const error = new Error('Cannot cancel a completed loan')
    error.statusCode = 400
    throw error
  }

  if (loan.status === 'cancelled') {
    const error = new Error('Loan is already cancelled')
    error.statusCode = 400
    throw error
  }

  loan.status = 'cancelled'
  loan.cancellationReason = data.reason
  await loan.save()

  await createAuditLog({
    performedBy: userId,
    action: 'LOAN_CANCELLED',
    module: 'loans',
    resourceId: loan._id,
    description: `Loan was cancelled. Reason: ${data.reason}`,
  })

  return loan
}

// ─── Process Loan Deductions ──────────────────────────────
// called internally by payroll service during payroll run
const processLoanDeduction = async (employeeId, session) => {
  // find active loan for this employee
  const loan = await Loan.findOne({
    employeeId,
    status: 'active',
  }).session(session)

  if (!loan) return 0 // no active loan — deduction is 0

  // check if loan started before or during current month
  const now = new Date()
  if (loan.startDate > now) return 0 // loan hasn't started yet

  const deductionAmount = Math.min(
    loan.monthlyDeduction,
    loan.outstandingBalance
  )

  // update loan
  loan.outstandingBalance -= deductionAmount
  loan.installmentsPaid += 1

  // check if loan is fully paid
  if (loan.outstandingBalance <= 0) {
    loan.outstandingBalance = 0
    loan.status = 'completed'
    loan.actualEndDate = new Date()
  }

  await loan.save({ session })

  return deductionAmount
}

module.exports = {
  createLoan,
  getAllLoans,
  getLoan,
  getEmployeeLoans,
  updateLoan,
  approveLoan,
  cancelLoan,
  processLoanDeduction,
}