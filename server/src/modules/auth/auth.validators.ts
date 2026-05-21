import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(72).required(),
  fullName: Joi.string().min(2).max(80).trim().required(),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),
  role: Joi.string().valid('customer', 'restaurant').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(72).required(),
});

export const resetPasswordParamsSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

export const verifyEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
});

export const resendOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});
