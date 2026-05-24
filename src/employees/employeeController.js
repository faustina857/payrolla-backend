const employeeService = require('./employeeService')

//  Add Employee 
const addEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.addEmployee(req.body, req.user._id)

    res.status(201).json({
      status: 'success',
      message: 'Employee added successfully. Invite email sent.',
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Get All Employees 
const getAllEmployees = async (req, res, next) => {
  try {
    const result = await employeeService.getAllEmployees(req.query)

    res.status(200).json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// Get One Employee 
const getEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployee(req.params.id)

    res.status(200).json({
      status: 'success',
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Get Own Profile
const getMyProfile = async (req, res, next) => {
  try {
    const employee = await employeeService.getMyProfile(req.user._id)

    res.status(200).json({
      status: 'success',
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

//  Update Employee (HR/Admin) 
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployee(
      req.params.id,
      req.body,
      req.user._id
    )

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

//  Update Own Profile (Employee) 
const updateMyProfile = async (req, res, next) => {
  try {
    const employee = await employeeService.updateMyProfile(
      req.user._id,
      req.body
    )

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Terminate Employee 
const terminateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.terminateEmployee(
      req.params.id,
      req.body,
      req.user._id
    )

    res.status(200).json({
      status: 'success',
      message: `${employee.firstName} ${employee.lastName} has been terminated successfully`,
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Suspend Employee
const suspendEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.suspendEmployee(req.params.id, req.body, req.user._id)
    res.status(200).json({
      status: 'success',
      message: `${employee.firstName} ${employee.lastName} has been suspended`,
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Activate Employee 
const activateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.activateEmployee(req.params.id, req.body, req.user._id)
    res.status(200).json({
      status: 'success',
      message: `${employee.firstName} ${employee.lastName} has been reactivated`,
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

// Put Employee On Leave
const putEmployeeOnLeave = async (req, res, next) => {
  try {
    const employee = await employeeService.putEmployeeOnLeave(req.params.id, req.body, req.user._id)
    res.status(200).json({
      status: 'success',
      message: `${employee.firstName} ${employee.lastName} has been put on leave`,
      data: { employee },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  addEmployee,
  getAllEmployees,
  getEmployee,
  getMyProfile,
  updateEmployee,
  updateMyProfile,
  terminateEmployee,
  suspendEmployee,
  activateEmployee,
  putEmployeeOnLeave
}