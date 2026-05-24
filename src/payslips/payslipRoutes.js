const express = require('express')
const router = express.Router()
const payslipController = require('./payslipController')
const { protect, restrictTo } = require('../auth/authMiddleware')

router.use(protect)

// Employee self-service
router.get('/me', payslipController.getMyPayslips)

// Specific routes before /:id
router.get(
  '/employee/:employeeId',
  restrictTo('superAdmin', 'admin', 'hr'),
  payslipController.getEmployeePayslips
)

router.post(
  '/:id/resend-email',
  restrictTo('superAdmin', 'admin', 'hr'),
  payslipController.resendPayslipEmail
)

router.get(
  '/:id/download',
  payslipController.downloadPayslip
)

// Dynamic /:id routes last
router.get(
  '/:id',
  payslipController.getPayslip
)

// HR/Admin only
router.get(
  '/',
  restrictTo('superAdmin', 'admin', 'hr'),
  payslipController.getAllPayslips
)

module.exports = router