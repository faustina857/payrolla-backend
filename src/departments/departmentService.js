const Department = require('./departmentModel')
const Employee = require('../employees/employeeModel')
const { createAuditLog } = require('../audit/auditService')

// ─── Create Department ─────────────────────────────────
const createDepartment = async (data, userId) => {
  const { name, description, hodId } = data

  //check if department with same name already exists
  const existingDepartment = await Department.findOne({ name })
  if (existingDepartment) {
    const error = new Error('A department with this name already exists')
    error.statusCode = 400
    throw error
  }
  const department = new Department({ name, description, hodId })
  await department.save()

  await createAuditLog({
    performedBy: userId,
    action: 'DEPARTMENT_CREATED',
    module: 'departments',
    resourceId: department._id,
    description: `Department "${department.name}" was created`,
  })
  return department
}

// ─── Get All Departments ─────────────────────────────────
const getAllDepartments = async (query) => {
  const { page = 1, limit = 10 } = query
  const skip = (page - 1) * limit

  const departments = await Department.find()
    .skip(skip)
    .limit(limit)

  const totalDepartments = await Department.countDocuments()

  return {
    departments,
    totalDepartments,
    page,
    limit
  }
}

// ─── Get Department By ID ─────────────────────────────────
const getDepartmentById = async (id) => {
  const department = await Department.findById(id).populate('hodId', 'firstName lastName email')
  if (!department) {
    const error = new Error('Department not found')
    error.statusCode = 404
    throw error
  }
  return department
}

// ─── Update Department ─────────────────────────────────
const updateDepartment = async (id, data, userId) => {
  const { name, description, hodId } = data

  const department = await Department.findByIdAndUpdate(id, { name, description, hodId }, { returnDocument: 'after' })
  .populate('hodId', 'firstName lastName email')
  if (!department) {
    const error = new Error('Department not found')
    error.statusCode = 404
    throw error
  }

  await createAuditLog({
    performedBy: userId,
    action: 'DEPARTMENT_UPDATED',
    module: 'departments',
    resourceId: department._id,
    description: `Department "${department.name}" was updated`,
  })
  return department
}

// ─── Terminate Department ─────────────────────────────────
const terminateDepartment = async (id, userId) => {
  const department = await Department.findById(id)
  if (!department) {
    const error = new Error('Department not found')
    error.statusCode = 404
    throw error
  }
  // check if department has active employees
  const activeEmployees = await Employee.countDocuments({
    departmentId: id,
    employmentStatus: 'active'
  })
  if (activeEmployees > 0) {
    const error = new Error(`Cannot deactivate department with ${activeEmployees} active employees`)
    error.statusCode = 400
    throw error
  }
    department.status = 'inactive'
    await department.save()

  await createAuditLog({
    performedBy: userId,
    action: 'DEPARTMENT_DEACTIVATED',
    module: 'departments',
    resourceId: department._id,
    description: `Department "${department.name}" was deactivated`,
  })

  return department
}

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  terminateDepartment
}