const express = require('express')
const router = express.Router()
const payrollController = require('./payrollController')
const { protect, restrictTo } = require('../auth/authMiddleware')
const validate = require('../utils/validate')
const payrollValidation = require('./payrollValidation')

router.use(protect)

// HR + Admin + SuperAdmin
router.post(
  '/',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(payrollValidation.create),
  payrollController.createPayrollRun
)

router.get(
  '/',
  restrictTo('superAdmin', 'admin', 'hr'),
  payrollController.getAllPayrollRuns
)

// specific routes before /:id
router.patch(
  '/:id/submit',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(payrollValidation.submit),
  payrollController.submitPayrollRun
)

// SuperAdmin + Admin only
router.patch(
  '/:id/approve',
  restrictTo('superAdmin', 'admin'),
  validate(payrollValidation.approve),
  payrollController.approvePayrollRun
)

router.patch(
  '/:id/pay',
  restrictTo('superAdmin', 'admin'),
  payrollController.markAsPaid
)

router.patch(
  '/:id/cancel',
  restrictTo('superAdmin', 'admin'),
  validate(payrollValidation.cancel),
  payrollController.cancelPayrollRun
)

router.get(
  '/:id/payment-file',
  restrictTo('superAdmin', 'admin'),
  payrollController.generatePaymentFile
)

router.get(
  '/:id/preview',
  restrictTo('superAdmin', 'admin', 'hr'),
  payrollController.getPayrollPreview
)

// dynamic /:id routes last
router.get(
  '/:id',
  restrictTo('superAdmin', 'admin', 'hr'),
  payrollController.getPayrollRun
)

router.patch(
  '/:id',
  restrictTo('superAdmin', 'admin', 'hr'),
  validate(payrollValidation.update),
  payrollController.updatePayrollRun
)

module.exports = router