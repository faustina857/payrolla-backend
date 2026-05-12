const Employee = require('../employees/employeeModel')
const Payroll = require('../payroll/payrollModel')
const Payslip = require('../payslips/payslipModel')
const Loan = require('../loans/loanModel')
const AuditLog = require('../audit/auditModel')
const User = require('../auth/authModel')

// ─── Admin/SuperAdmin Dashboard ───────────────────────────
const getAdminDashboard = async () => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // start and end of current month
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  // start and end of last month
  const lastMonthStart = new Date(currentYear, currentMonth - 2, 1)
  const lastMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59)

  const [
    // workforce
    totalActiveEmployees,
    newHiresThisMonth,
    employeesOnLeave,
    suspendedEmployees,
    terminatedThisMonth,
    headcountByDepartment,

    // payroll
    currentPayrollRun,
    lastMonthPayrollRun,

    // loans
    totalActiveLoans,
    loansPendingApproval,

    // payslips
    totalPayslipsThisMonth,
    failedPayslipEmails,

    // recent activity
    recentAuditLogs,
  ] = await Promise.all([
    // workforce queries
    Employee.countDocuments({ employmentStatus: 'active' }),
    Employee.countDocuments({
      startDate: { $gte: monthStart, $lte: monthEnd },
    }),
    Employee.countDocuments({ employmentStatus: 'onLeave' }),
    Employee.countDocuments({ employmentStatus: 'suspended' }),
    Employee.countDocuments({
      employmentStatus: 'terminated',
      endDate: { $gte: monthStart, $lte: monthEnd },
    }),
    Employee.aggregate([
      { $match: { employmentStatus: 'active' } },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $project: {
          department: { $arrayElemAt: ['$department.name', 0] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    // payroll queries
    Payroll.findOne({ month: currentMonth, year: currentYear })
      .select('period status summary createdAt'),
    Payroll.findOne({
      month: currentMonth === 1 ? 12 : currentMonth - 1,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
    }).select('summary'),

    // loan queries
    Loan.countDocuments({ status: 'active' }),
    Loan.countDocuments({ status: 'pending' }),

    // payslip queries
    Payslip.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }),
    Payslip.countDocuments({
      emailSent: false,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    }),

    // recent audit logs
    AuditLog.find()
      .populate('performedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(5),
  ])

  // calculate loan totals
  const loanTotals = await Loan.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalOutstandingBalance: { $sum: '$outstandingBalance' },
        totalMonthlyDeductions: { $sum: '$monthlyDeduction' },
      },
    },
  ])

  // calculate payroll comparison
  const currentPayrollCost = currentPayrollRun?.summary?.totalNetSalary || 0
  const lastPayrollCost = lastMonthPayrollRun?.summary?.totalNetSalary || 0
  const payrollChange =
    lastPayrollCost > 0
      ? Number(
          (((currentPayrollCost - lastPayrollCost) / lastPayrollCost) * 100).toFixed(2)
        )
      : 0

  return {
    workforce: {
      totalActiveEmployees,
      newHiresThisMonth,
      employeesOnLeave,
      suspendedEmployees,
      terminatedThisMonth,
      headcountByDepartment,
    },
    payroll: {
      currentRun: currentPayrollRun
        ? {
            period: currentPayrollRun.period,
            status: currentPayrollRun.status,
            totalGrossSalary: currentPayrollRun.summary?.totalGrossSalary || 0,
            totalNetSalary: currentPayrollRun.summary?.totalNetSalary || 0,
            totalPaye: currentPayrollRun.summary?.totalPaye || 0,
            totalPension: currentPayrollRun.summary?.totalPension || 0,
            totalEmployees: currentPayrollRun.summary?.totalEmployees || 0,
          }
        : null,
      comparedToLastMonth: {
        lastMonthCost: lastPayrollCost,
        currentMonthCost: currentPayrollCost,
        changePercent: payrollChange,
        trend: payrollChange > 0 ? 'up' : payrollChange < 0 ? 'down' : 'same',
      },
    },
    loans: {
      totalActiveLoans,
      loansPendingApproval,
      totalOutstandingBalance:
        loanTotals[0]?.totalOutstandingBalance || 0,
      totalMonthlyDeductions:
        loanTotals[0]?.totalMonthlyDeductions || 0,
    },
    payslips: {
      totalGeneratedThisMonth: totalPayslipsThisMonth,
      failedEmails: failedPayslipEmails,
    },
    recentActivity: recentAuditLogs,
  }
}

// ─── HR Dashboard ─────────────────────────────────────────
const getHRDashboard = async () => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  const [
    totalActiveEmployees,
    newHiresThisMonth,
    employeesOnLeave,
    suspendedEmployees,
    pendingInvites,
    headcountByDepartment,
    currentPayrollRun,
    employeesWithoutBankDetails,
    employeesWithoutSalary,
  ] = await Promise.all([
    Employee.countDocuments({ employmentStatus: 'active' }),
    Employee.countDocuments({
      startDate: { $gte: monthStart, $lte: monthEnd },
    }),
    Employee.countDocuments({ employmentStatus: 'onLeave' }),
    Employee.countDocuments({ employmentStatus: 'suspended' }),
    // employees who haven't accepted invite yet
    User.countDocuments({ isInviteAccepted: false, role: 'employee' }),
    Employee.aggregate([
      { $match: { employmentStatus: 'active' } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $project: {
          department: { $arrayElemAt: ['$department.name', 0] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),
    Payroll.findOne({ month: currentMonth, year: currentYear })
      .select('period status'),
    // employees missing bank details
    Employee.countDocuments({
      employmentStatus: 'active',
      $or: [
        { 'bankDetails.accountNumber': null },
        { 'bankDetails.bankName': null },
        { 'bankDetails.accountNumber': { $exists: false } },
      ],
    }),
    // employees missing salary structure
    Employee.countDocuments({
      employmentStatus: 'active',
      $or: [
        { 'salary.basicSalary': { $lte: 0 } },
        { 'salary.basicSalary': { $exists: false } },
      ],
    }),
  ])

  return {
    workforce: {
      totalActiveEmployees,
      newHiresThisMonth,
      employeesOnLeave,
      suspendedEmployees,
      pendingInvites,
      headcountByDepartment,
    },
    payroll: {
      currentRun: currentPayrollRun
        ? {
            period: currentPayrollRun.period,
            status: currentPayrollRun.status,
          }
        : null,
      hasCurrentRun: !!currentPayrollRun,
    },
    incompleteProfiles: {
      missingBankDetails: employeesWithoutBankDetails,
      missingSalaryStructure: employeesWithoutSalary,
    },
  }
}

// ─── Employee Dashboard ───────────────────────────────────
const getEmployeeDashboard = async (userId) => {
  const employee = await Employee.findOne({ userId })
    .populate('departmentId', 'name')

  if (!employee) {
    const error = new Error('Employee profile not found')
    error.statusCode = 404
    throw error
  }

  // days worked at company
  const startDate = new Date(employee.startDate)
  const today = new Date()
  const daysWorked = Math.floor(
    (today - startDate) / (1000 * 60 * 60 * 24)
  )

  // latest payslip
  const latestPayslip = await Payslip.findOne({
    employeeId: employee._id,
  })
    .sort({ createdAt: -1 })
    .select('period grossSalary netSalary deductions payDate earnings')

  // active loan
  const activeLoan = await Loan.findOne({
    employeeId: employee._id,
    status: 'active',
  }).select(
    'loanType totalAmount monthlyDeduction outstandingBalance numberOfInstallments installmentsPaid expectedEndDate startDate'
  )

  // loan progress percentage
  let loanProgress = null
  if (activeLoan) {
    const amountPaid = activeLoan.totalAmount - activeLoan.outstandingBalance
    loanProgress = Number(
      ((amountPaid / activeLoan.totalAmount) * 100).toFixed(2)
    )
  }

  // leave details
  let leaveDetails = null
  if (employee.employmentStatus === 'onLeave') {
    const leaveEnd = new Date(employee.leaveEndDate)
    const daysRemaining = Math.ceil(
      (leaveEnd - today) / (1000 * 60 * 60 * 24)
    )
    leaveDetails = {
      type: employee.leaveType,
      startDate: employee.leaveStartDate,
      endDate: employee.leaveEndDate,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    }
  }

  return {
    profile: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeId: employee.employeeId,
      jobTitle: employee.jobTitle,
      department: employee.departmentId?.name,
      employmentType: employee.employmentType,
      startDate: employee.startDate,
      daysWorked,
      status: employee.employmentStatus,
    },
    latestPayslip: latestPayslip
      ? {
          period: latestPayslip.period,
          grossSalary: latestPayslip.earnings?.grossSalary || 0,
          totalDeductions: latestPayslip.deductions?.totalDeductions || 0,
          netSalary: latestPayslip.netSalary,
          payDate: latestPayslip.payDate,
        }
      : null,
    loan: activeLoan
      ? {
          loanType: activeLoan.loanType,
          totalAmount: activeLoan.totalAmount,
          monthlyDeduction: activeLoan.monthlyDeduction,
          outstandingBalance: activeLoan.outstandingBalance,
          numberOfInstallments: activeLoan.numberOfInstallments,
          installmentsPaid: activeLoan.installmentsPaid,
          expectedEndDate: activeLoan.expectedEndDate,
          progressPercent: loanProgress,
        }
      : null,
    leave: leaveDetails,
  }
}

module.exports = {
  getAdminDashboard,
  getHRDashboard,
  getEmployeeDashboard,
}