const payslipService = require('./payslipService')

// Get All Payslips
const getAllPayslips = async (req, res, next) => {
  try {
    const result = await payslipService.getAllPayslips(req.query)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// Get Employee Payslip History
const getEmployeePayslips = async (req, res, next) => {
  try {
    const result = await payslipService.getEmployeePayslips(
      req.params.employeeId
    )

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// Get Own Payslips
const getMyPayslips = async (req, res, next) => {
  try {
    const payslips = await payslipService.getMyPayslips(req.user._id)

    res.status(200).json({
      status: 'success',
      data: { payslips },
    })
  } catch (error) {
    next(error)
  }
}

// Get One Payslip
const getPayslip = async (req, res, next) => {
  try {
    const payslip = await payslipService.getPayslip(
      req.params.id,
      req.user._id,
      req.user.role
    )

    res.status(200).json({
      status: 'success',
      data: { payslip },
    })
  } catch (error) {
    next(error)
  }
}

// Download Payslip PDF
const downloadPayslip = async (req, res, next) => {
  try {
    const { html, payslip } = await payslipService.generatePayslipPDF(
      req.params.id,
      req.user._id,
      req.user.role
    )

    // format filename
    const name = `${payslip.employeeSnapshot.firstName}-${payslip.employeeSnapshot.lastName}`
      .toLowerCase()
      .replace(' ', '-')
    const period = payslip.period.toLowerCase().replace(' ', '-')
    const filename = `payslip-${name}-${period}.html`

    res.setHeader('Content-Type', 'text/html')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    )

    res.send(html)
  } catch (error) {
    next(error)
  }
}

// Resend Payslip Email
const resendPayslipEmail = async (req, res, next) => {
  try {
    const payslip = await payslipService.resendPayslipEmail(req.params.id, req.user._id)

    res.status(200).json({
      status: 'success',
      message: `Payslip email resent to ${payslip.employeeId.firstName} ${payslip.employeeId.lastName}`,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllPayslips,
  getEmployeePayslips,
  getMyPayslips,
  getPayslip,
  downloadPayslip,
  resendPayslipEmail,
}