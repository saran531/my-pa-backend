const { validationResult } = require('express-validator');

/**
 * Middleware — returns 422 with the first validation error if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: errors.array()[0].msg });
  }
  next();
};

module.exports = { validate };
