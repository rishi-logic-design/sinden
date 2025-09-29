// middleware/validators.js
const { body, validationResult } = require("express-validator");

const passwordRules = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/\d/)
  .withMessage("Password must contain a number")
  .matches(/[A-Z]/)
  .withMessage("Password must contain an uppercase letter")
  .matches(/[a-z]/)
  .withMessage("Password must contain a lowercase letter");

const registerValidation = [
  body("fullName").trim().notEmpty().withMessage("fullName is required"),
  body("email").isEmail().withMessage("Provide a valid email"),
  passwordRules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];

const loginValidation = [
  body("email").isEmail().withMessage("Provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];

module.exports = { registerValidation, loginValidation };
