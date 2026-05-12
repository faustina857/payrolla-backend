const validate = (schema) => (req, res, next) => {
  // treat missing body as empty object
  const body = req.body || {}
  const { error } = schema.validate(body, { abortEarly: false })

  if (error) {
    const errors = error.details.map((detail) => detail.message)
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    })
  }

  next()
}

module.exports = validate