const departmentService = require('./departmentService')

//  Create Department 
const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.body, req.user._id)
    res.status(201).json({
      status: 'success',
      message: 'Department created successfully',
      data: { department },
    })
  } catch (error) {
    next(error)
  }
}

//  Get All Departments 
const getAllDepartments = async (req, res, next) => {
  try {
    const result = await departmentService.getAllDepartments(req.query)
    res.status(200).json({
      status: 'success',
      message: 'Departments retrieved successfully',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

//  Get Department By ID 
const getDepartmentById = async (req, res, next) => {
  try { 
    const department = await departmentService.getDepartmentById(req.params.id)
    res.status(200).json({
      status: 'success',
      message: 'Department retrieved successfully',
      data: { department }
    })
  } catch (error) {
    next(error)
  }
}

//  Update Department
const updateDepartment = async (req, res, next) => {
  try { 
    const department = await departmentService.updateDepartment(req.params.id, req.body, req.user._id)
    res.status(200).json({
      status: 'success',
      message: 'Department updated successfully',
      data: { department }
    })
  } catch (error) {
    next(error)
  }
}

//  Terminate Department
const terminateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.terminateDepartment(req.params.id, req.user._id)
    res.status(200).json({
      status: 'success',
      message: 'Department terminated successfully',
      data: { department }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  terminateDepartment
}