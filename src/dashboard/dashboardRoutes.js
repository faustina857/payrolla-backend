const express = require('express')
const router = express.Router()
const dashboardController = require('./dashboardController')
const { protect, restrictTo } = require('../auth/authMiddleware')

router.use(protect)

// employee dashboard
router.get('/me', dashboardController.getEmployeeDashboard)

// hr dashboard
router.get(
  '/hr',
  restrictTo('superAdmin', 'admin', 'hr'),
  dashboardController.getHRDashboard
)

// admin/superAdmin dashboard
router.get(
  '/admin',
  restrictTo('superAdmin', 'admin'),
  dashboardController.getAdminDashboard
)

module.exports = router