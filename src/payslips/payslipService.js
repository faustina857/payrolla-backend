const Payslip = require('./payslipModel')
const Employee = require('../employees/employeeModel')
const { sendEmail, emailTemplates } = require('../utils/email')
const { createAuditLog } = require('../audit/auditService')

// Get All Payslips
const getAllPayslips = async (query) => {
  const {
    page = 1,
    limit = 10,
    period,
    employeeId,
    department,
    status,
  } = query

  const filter = {}
  if (period) filter.period = period
  if (employeeId) filter.employeeId = employeeId
  if (status) filter.status = status

  // filter by department requires looking up employees first
  if (department) {
    const employees = await Employee.find({
      departmentId: department,
    }).select('_id')
    filter.employeeId = {
      $in: employees.map((e) => e._id),
    }
  }

  const skip = (page - 1) * limit

  const [payslips, total] = await Promise.all([
    Payslip.find(filter)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('payrollId', 'period status')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Payslip.countDocuments(filter),
  ])

  return {
    payslips,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }
}

// Get Employee Payslip History
const getEmployeePayslips = async (employeeId) => {
  const employee = await Employee.findById(employeeId)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  const payslips = await Payslip.find({ employeeId })
    .populate('payrollId', 'period status')
    .sort({ createdAt: -1 })

  return { employee, payslips }
}

// Get Own Payslips
const getMyPayslips = async (userId) => {
  const employee = await Employee.findOne({ userId })
  if (!employee) {
    const error = new Error('Employee profile not found')
    error.statusCode = 404
    throw error
  }

  const payslips = await Payslip.find({ employeeId: employee._id })
    .populate('payrollId', 'period status')
    .sort({ createdAt: -1 })

  return payslips
}

// Get One Payslip
const getPayslip = async (id, userId, userRole) => {
  const payslip = await Payslip.findById(id)
    .populate('employeeId', 'firstName lastName employeeId departmentId')
    .populate('payrollId', 'period status paidAt')

  if (!payslip) {
    const error = new Error('Payslip not found')
    error.statusCode = 404
    throw error
  }

  // if employee role — can only view their own payslip
  if (userRole === 'employee') {
    const employee = await Employee.findOne({ userId })
    if (!employee || payslip.employeeId._id.toString() !== employee._id.toString()) {
      const error = new Error('You do not have permission to view this payslip')
      error.statusCode = 403
      throw error
    }
  }

  return payslip
}

// Generate PDF
const generatePayslipPDF = async (id, userId, userRole) => {
  const payslip = await getPayslip(id, userId, userRole)

  // build HTML for PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { background: #0F172A; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #94A3B8; }
        .employee-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .info-item label { font-size: 11px; color: #666; display: block; margin-bottom: 4px; }
        .info-item p { font-size: 13px; font-weight: bold; margin: 0; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 12px; color: #666; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        table { width: 100%; font-size: 13px; border-collapse: collapse; }
        td { padding: 6px 0; }
        td:last-child { text-align: right; }
        .total-row td { font-weight: bold; border-top: 1px solid #333; padding-top: 8px; }
        .net-pay { background: #0F172A; color: white; padding: 16px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .net-pay span:first-child { font-size: 13px; color: #94A3B8; }
        .net-pay span:last-child { font-size: 22px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PAYSLIP — ${payslip.period}</h1>
        <p>Pay date: ${new Date(payslip.payDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>

      <div class="employee-info">
        <div class="info-item">
          <label>Employee name</label>
          <p>${payslip.employeeSnapshot.firstName} ${payslip.employeeSnapshot.lastName}</p>
        </div>
        <div class="info-item">
          <label>Employee ID</label>
          <p>${payslip.employeeSnapshot.employeeId}</p>
        </div>
        <div class="info-item">
          <label>Department</label>
          <p>${payslip.employeeSnapshot.department}</p>
        </div>
        <div class="info-item">
          <label>Job title</label>
          <p>${payslip.employeeSnapshot.jobTitle}</p>
        </div>
        <div class="info-item">
          <label>Bank</label>
          <p>${payslip.employeeSnapshot.bankName}</p>
        </div>
        <div class="info-item">
          <label>Account number</label>
          <p>${payslip.employeeSnapshot.accountNumber}</p>
        </div>
      </div>

      <div class="section">
        <h3>EARNINGS</h3>
        <table>
          <tr><td>Basic salary</td><td>₦${payslip.earnings.basicSalary.toLocaleString()}</td></tr>
          <tr><td>Housing allowance</td><td>₦${payslip.earnings.housing.toLocaleString()}</td></tr>
          <tr><td>Transport allowance</td><td>₦${payslip.earnings.transport.toLocaleString()}</td></tr>
          <tr><td>Meal allowance</td><td>₦${payslip.earnings.meal.toLocaleString()}</td></tr>
          <tr><td>Utility allowance</td><td>₦${payslip.earnings.utility.toLocaleString()}</td></tr>
          <tr class="total-row"><td>Gross salary</td><td>₦${payslip.earnings.grossSalary.toLocaleString()}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>DEDUCTIONS</h3>
        <table>
          <tr><td>PAYE tax</td><td>-₦${payslip.deductions.paye.toLocaleString()}</td></tr>
          <tr><td>Employee pension (8%)</td><td>-₦${payslip.deductions.employeePension.toLocaleString()}</td></tr>
          <tr><td>NHF (2.5%)</td><td>-₦${payslip.deductions.nhf.toLocaleString()}</td></tr>
          <tr><td>Loan repayment</td><td>-₦${payslip.deductions.loanRepayment.toLocaleString()}</td></tr>
          <tr class="total-row"><td>Total deductions</td><td>-₦${payslip.deductions.totalDeductions.toLocaleString()}</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>EMPLOYER CONTRIBUTIONS</h3>
        <table>
          <tr><td>Employer pension (10%)</td><td>₦${payslip.employerContributions.employerPension.toLocaleString()}</td></tr>
        </table>
      </div>

      ${payslip.isProRated ? `
      <div class="section">
        <h3>PRO-RATING</h3>
        <table>
          <tr><td>Pro-rate factor</td><td>${(payslip.proRateFactor * 100).toFixed(2)}%</td></tr>
        </table>
      </div>
      ` : ''}

      <div class="net-pay">
        <span>Net pay (take home)</span>
        <span>₦${payslip.netSalary.toLocaleString()}</span>
      </div>

      <div class="footer">
        <p>This is a system generated payslip from Payrolla Payroll Management System</p>
        <p>Generated on ${new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    </body>
    </html>
  `

  return { html, payslip }
}

// Resend Payslip Email
const resendPayslipEmail = async (id, userId) => {
  const payslip = await Payslip.findById(id)
    .populate('employeeId', 'firstName lastName email')

  if (!payslip) {
    const error = new Error('Payslip not found')
    error.statusCode = 404
    throw error
  }

  const template = emailTemplates.payslipNotification(
    payslip.employeeId.firstName,
    payslip.period,
    payslip
  )

  await sendEmail({
    to: payslip.employeeId.email,
    subject: template.subject,
    html: template.html,
  })

  await Payslip.findByIdAndUpdate(id, {
    emailSent: true,
    emailSentAt: new Date(),
    status: 'sent',
  })

  await createAuditLog({
    performedBy: userId,
    action: 'PAYSLIP_EMAIL_RESENT',
    module: 'payslips',
    resourceId: payslip._id,
    description: `Payslip email for ${payslip.period} resent to ${payslip.employeeId.email}`,
  })
  return payslip
}

module.exports = {
  getAllPayslips,
  getEmployeePayslips,
  getMyPayslips,
  getPayslip,
  generatePayslipPDF,
  resendPayslipEmail,
}