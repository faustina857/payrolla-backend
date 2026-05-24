const express = require('express')
const router = express.Router()
const departmentController = require('./departmentController')
const { protect, restrictTo } = require('../auth/authMiddleware')
const validate = require('../utils/validate')
const departmentValidation = require('./departmentValidation')

//  All routes require authentication
router.use(protect)
router.get('/', departmentController.getAllDepartments)             
router.get('/:id', departmentController.getDepartmentById)


router.use(restrictTo('superAdmin', 'admin', 'hr'))
router.post('/', validate(departmentValidation.create), departmentController.createDepartment)
router.patch('/:id/deactivate', departmentController.terminateDepartment)

router.patch('/:id', validate(departmentValidation.update), departmentController.updateDepartment)  

module.exports = router