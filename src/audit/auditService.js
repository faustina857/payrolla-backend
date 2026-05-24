const AuditLog = require('./auditModel')

//  Create Audit Log 
// called internally by other services — not via API
const createAuditLog = async ({
  performedBy,
  userSnapshot,
  action,
  module,
  resourceId = null,
  description,
  changes = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await AuditLog.create({
      performedBy,
      userSnapshot,
      action,
      module,
      resourceId,
      description,
      changes,
      ipAddress,
      userAgent,
    })
  } catch (error) {
    // audit log failure should never break the main operation
    console.error(`Audit log error: ${error.message}`)
  }
}

// Get All Audit Logs
const getAllAuditLogs = async (query) => {
  const {
    page = 1,
    limit = 20,
    action,
    module,
    performedBy,
    startDate,
    endDate,
  } = query

  const filter = {}
  if (action) filter.action = action
  if (module) filter.module = module
  if (performedBy) filter.performedBy = performedBy

  // date range filter
  if (startDate || endDate) {
    filter.createdAt = {}
    if (startDate) filter.createdAt.$gte = new Date(startDate)
    if (endDate) filter.createdAt.$lte = new Date(endDate)
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('performedBy', 'firstName lastName email role')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    AuditLog.countDocuments(filter),
  ])

  return {
    logs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  }
}

// Get One Audit Log
const getAuditLog = async (id) => {
  const log = await AuditLog.findById(id).populate(
    'performedBy',
    'firstName lastName email role'
  )

  if (!log) {
    const error = new Error('Audit log not found')
    error.statusCode = 404
    throw error
  }

  return log
}

//  Get audit logs for a Specific resource
const getResourceAuditLogs = async (resourceId) => {
  const logs = await AuditLog.find({ resourceId })
    .populate('performedBy', 'firstName lastName email role')
    .sort({ createdAt: -1 })

  return logs
}

module.exports = {
  createAuditLog,
  getAllAuditLogs,
  getAuditLog,
  getResourceAuditLogs,
}