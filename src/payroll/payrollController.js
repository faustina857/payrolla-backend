const payrollService = require('./payrollService')
const validate = require('../utils/validate')
const payrollValidation = require('./payrollValidation')

// ─── Create Payroll Run ───────────────────────────────────
const createPayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.createPayrollRun(
      req.body,
      req.user._id
    )

    res.status(201).json({
      status: 'success',
      message: `Payroll run for ${payroll.period} created successfully`,
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Get All Payroll Runs ─────────────────────────────────
const getAllPayrollRuns = async (req, res, next) => {
  try {
    const result = await payrollService.getAllPayrollRuns(req.query)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ─── Get One Payroll Run ──────────────────────────────────
const getPayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.getPayrollRun(req.params.id)

    res.status(200).json({
      status: 'success',
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Update Draft Payroll Run ─────────────────────────────
const updatePayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.updatePayrollRun(
      req.params.id,
      req.body
    )

    res.status(200).json({
      status: 'success',
      message: 'Payroll run updated successfully',
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Submit Payroll Run ───────────────────────────────────
const submitPayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.submitPayrollRun(
      req.params.id,
      req.user._id,
      req.body
    )

    res.status(200).json({
      status: 'success',
      message: `Payroll run for ${payroll.period} submitted for approval`,
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Approve Payroll Run ──────────────────────────────────
const approvePayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.approvePayrollRun(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body
    )

    res.status(200).json({
      status: 'success',
      message: `Payroll run for ${payroll.period} approved successfully`,
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Mark Payroll As Paid ─────────────────────────────────
const markAsPaid = async (req, res, next) => {
  try {
    const payroll = await payrollService.markAsPaid(
      req.params.id,
      req.user._id
    )

    res.status(200).json({
      status: 'success',
      message: `Payroll run for ${payroll.period} marked as paid. Payslips generated and sent to employees.`,
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Cancel Payroll Run ───────────────────────────────────
const cancelPayrollRun = async (req, res, next) => {
  try {
    const payroll = await payrollService.cancelPayrollRun(
      req.params.id,
      req.body,
      req.user._id
    )

    res.status(200).json({
      status: 'success',
      message: `Payroll run for ${payroll.period} has been cancelled`,
      data: { payroll },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Payroll Preview ──────────────────────────────────────
const getPayrollPreview = async (req, res, next) => {
  try {
    const result = await payrollService.getPayrollPreview(req.params.id)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ─── Generate Payment File ────────────────────────────────
const generatePaymentFile = async (req, res, next) => {
  try {
    const { csv, period } = await payrollService.generatePaymentFile(
      req.params.id
    )

    // format period for filename e.g 'November 2025' -> 'november-2025'
    const filename = period.toLowerCase().replace(' ', '-')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payrolla-payment-${filename}.csv`
    )

    res.send(csv)
  } catch (error) {
    next(error)
  }
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