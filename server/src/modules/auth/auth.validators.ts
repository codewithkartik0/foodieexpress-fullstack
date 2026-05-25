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

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(80).trim().optional(),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .allow('', null)
    .optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().optional(),
        label: Joi.string().max(40).trim().optional(),
        line1: Joi.string().max(200).trim().required(),
        line2: Joi.string().max(200).trim().allow('').optional(),
        city: Joi.string().max(80).trim().required(),
        state: Joi.string().max(80).trim().required(),
        postalCode: Joi.string().max(12).trim().required(),
        country: Joi.string().max(60).trim().default('IN'),
        isDefault: Joi.boolean().optional(),
      }),
    )
    .max(5)
    .optional(),
});
