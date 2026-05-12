const express = require('express')
const router = express.Router()
const auditController = require('./auditController')
const { protect, restrictTo } = require('../auth/authMiddleware')

router.use(protect)
router.use(restrictTo('superAdmin', 'admin'))

// specific routes before /:id
router.get(
  '/resource/:resourceId',
  auditController.getResourceAuditLogs
)

// dynamic routes last
router.get('/', auditController.getAllAuditLogs)
router.get('/:id', auditController.getAuditLog)

module.exports = router