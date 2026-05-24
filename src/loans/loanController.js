const loanService = require('./loanService')
const validate = require('../utils/validate')
const loanValidation = require('./loanValidation')

// Create Loan
const createLoan = async (req, res, next) => {
  try {
    const loan = await loanService.createLoan(req.body, req.user._id)

    res.status(201).json({
      status: 'success',
      message: 'Loan created successfully. Awaiting approval.',
      data: { loan },
    })
  } catch (error) {
    next(error)
  }
}

// Get All Loans
const getAllLoans = async (req, res, next) => {
  try {
    const result = await loanService.getAllLoans(req.query)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// Get One Loan
const getLoan = async (req, res, next) => {
  try {
    const loan = await loanService.getLoan(req.params.id)

    res.status(200).json({
      status: 'success',
      data: { loan },
    })
  } catch (error) {
    next(error)
  }
}

// Get Own Loans (Employee)
const getMyLoans = async (req, res, next) => {
  try {
    const loans = await loanService.getEmployeeLoans(req.user._id)

    res.status(200).json({
      status: 'success',
      data: { loans },
    })
  } catch (error) {
    next(error)
  }
}

// Update Loan
const updateLoan = async (req, res, next) => {
  try {
    const loan = await loanService.updateLoan(req.params.id, req.body, req.user._id)

    res.status(200).json({
      status: 'success',
      message: 'Loan updated successfully',
      data: { loan },
    })
  } catch (error) {
    next(error)
  }
}

// Approve Loan
const approveLoan = async (req, res, next) => {
  try {
    const loan = await loanService.approveLoan(
      req.params.id,
      req.user._id,
      req.body
    )

    res.status(200).json({
      status: 'success',
      message: 'Loan approved successfully',
      data: { loan },
    })
  } catch (error) {
    next(error)
  }
}

// Cancel Loan
const cancelLoan = async (req, res, next) => {
  try {
    const loan = await loanService.cancelLoan(req.params.id, req.body, req.user._id)

    res.status(200).json({
      status: 'success',
      message: 'Loan cancelled successfully',
      data: { loan },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createLoan,
  getAllLoans,
  getLoan,
  getMyLoans,
  updateLoan,
  approveLoan,
  cancelLoan,
}