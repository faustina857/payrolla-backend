const dashboardService = require('./dashboardService')

// ─── Admin/SuperAdmin Dashboard ───────────────────────────
const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboard()

    res.status(200).json({
      status: 'success',
      data,
    })
  } catch (error) {
    next(error)
  }
}

// ─── HR Dashboard ─────────────────────────────────────────
const getHRDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getHRDashboard()

    res.status(200).json({
      status: 'success',
      data,
    })
  } catch (error) {
    next(error)
  }
}

// ─── Employee Dashboard ───────────────────────────────────
const getEmployeeDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getEmployeeDashboard(req.user._id)

    res.status(200).json({
      status: 'success',
      data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAdminDashboard,
  getHRDashboard,
  getEmployeeDashboard,
}