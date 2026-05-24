const auditService = require('./auditService')

//  Get all audit logs 
const getAllAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAllAuditLogs(req.query)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

//  Get one audit log 
const getAuditLog = async (req, res, next) => {
  try {
    const log = await auditService.getAuditLog(req.params.id)

    res.status(200).json({
      status: 'success',
      data: { log },
    })
  } catch (error) {
    next(error)
  }
}

//  Get resource audit logs 
const getResourceAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditService.getResourceAuditLogs(
      req.params.resourceId
    )

    res.status(200).json({
      status: 'success',
      data: { logs },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllAuditLogs,
  getAuditLog,
  getResourceAuditLogs,
}