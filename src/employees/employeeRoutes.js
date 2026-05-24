const express = require('express')
const router = express.Router()
const employeeController = require('./employeeController')
const { protect, restrictTo } = require('../auth/authMiddleware')
const validate = require('../utils/validate')
const employeeValidation = require('./employeeValidation')

// All routes require authentication
router.use(protect)

// Employee self-service routes
router.get('/me', employeeController.getMyProfile)

router.patch(
  '/me',
  validate(employeeValidation.updateMe),
  employeeController.updateMyProfile
)

// HR/Admin only routes
router.use(restrictTo('superAdmin', 'admin', 'hr'))

router.post(
  '/',
  validate(employeeValidation.create),
  employeeController.addEmployee
)

router.get('/', employeeController.getAllEmployees)

router.get('/:id', employeeController.getEmployee)

router.patch(
  '/:id/terminate',
  validate(employeeValidation.terminate),
  employeeController.terminateEmployee
)

router.patch(
  '/:id',
  validate(employeeValidation.update),
  employeeController.updateEmployee
)

router.patch(
  '/:id/suspend',
  validate(employeeValidation.suspend),
  employeeController.suspendEmployee
)

router.patch(
  '/:id/activate',
  validate(employeeValidation.activate),
  employeeController.activateEmployee
)

router.patch(
  '/:id/leave',
  validate(employeeValidation.leave),
  employeeController.putEmployeeOnLeave
)

module.exports = router