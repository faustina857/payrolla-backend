const express = require('express')
const router = express.Router()
const loanController = require('./loanController')
const { protect, restrictTo } = require('../auth/authMiddleware')
const validate = require('../utils/validate')
const loanValidation = require('./loanValidation')

router.use(protect)

// ─── Employee self-service ────────────────────────────────
// employee views their own loans
router.get('/me', loanController.getMyLoans)

// ─── HR/Admin only ────────────────────────────────────────
// create loan
router.post(
  '/',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(loanValidation.create),
  loanController.createLoan
)

// get all loans
router.get(
  '/',
  restrictTo('superAdmin', 'admin', 'hr'),
  loanController.getAllLoans
)

// specific routes before /:id
router.patch(
  '/:id/approve',
  restrictTo('superAdmin', 'admin'),
  validate(loanValidation.approve),
  loanController.approveLoan
)

router.patch(
  '/:id/cancel',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(loanValidation.cancel),
  loanController.cancelLoan
)

// dynamic /:id routes last
router.get(
  '/:id',
  restrictTo('superAdmin', 'admin', 'hr'),
  loanController.getLoan
)

router.patch(
  '/:id',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(loanValidation.update),
  loanController.updateLoan
)

module.exports = router