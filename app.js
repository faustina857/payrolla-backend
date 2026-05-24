const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const { nodeEnv } = require('./src/config/env')
const connectDB = require('./src/config/db')

// Import Routes 
const authRoutes = require('./src/auth/authRoutes')
const employeeRoutes = require('./src/employees/employeeRoutes')
const departmentRoutes = require('./src/departments/departmentRoutes')
const payrollRoutes = require('./src/payroll/payrollRoutes')
const payslipRoutes = require('./src/payslips/payslipRoutes')
const auditRoutes = require('./src/audit/auditRoutes')
const loanRoutes = require('./src/loans/loanRoutes')
const dashboardRoutes = require('./src/dashboard/dashboardRoutes')

// Connect to Database 
connectDB()

// Initialize App 
const app = express()
app.set('trust proxy', 1) // trust first proxy for correct IP logging

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// apply general limiter to all routes
app.use(generalLimiter)

// Global Middlewares 
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // allows cookies to be sent with requests
}))
app.use(express.json()) // parses incoming JSON request bodies
app.use(express.urlencoded({ extended: true })) // parses form data
app.use(cookieParser()) // parses cookies from incoming requests

// Routes 
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/employees', employeeRoutes)
app.use('/api/v1/departments', departmentRoutes)
app.use('/api/v1/payroll', payrollRoutes)
app.use('/api/v1/payslips', payslipRoutes)
app.use('/api/v1/audit', auditRoutes)
app.use('/api/v1/loans', loanRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
// Health Check 
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Payrolla API is running',
    environment: nodeEnv,
  })
})

// Handle Undefined Routes 
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found on this server`,
  })
})

// Global Error Handler 
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  
   console.error('ERROR:', err.message)
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  })
})

// Start Server 
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Payrolla server running in ${nodeEnv} mode on port ${PORT}`)
})

module.exports = app