const mongoose = require('mongoose')
const { mongoUri } = require('./env')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri)
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`Database connection error: ${error.message}`)
    process.exit(1) // stop the server if db connection fails
  }
}

module.exports = connectDB