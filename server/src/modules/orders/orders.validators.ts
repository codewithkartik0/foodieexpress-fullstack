import Joi from 'joi';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../models/Order';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const placeOrderSchema = Joi.object({
  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required(),
  deliveryAddress: Joi.object({
    fullName: Joi.string().min(2).max(80).required(),
    phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required(),
    line1: Joi.string().min(2).max(200).required(),
    line2: Joi.string().max(200).allow('').optional(),
    city: Joi.string().min(2).max(80).required(),
    state: Joi.string().min(2).max(80).required(),
    postalCode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required(),
    country: Joi.string().max(60).default('IN'),
  }).required(),
  notes: Joi.string().max(500).allow('').optional(),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .required(),
  note: Joi.string().max(500).allow('').optional(),
});

export const cancelSchema = Joi.object({
  reason: Joi.string().max(500).allow('').optional(),
});

export const listOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .optional(),
});

export const idParamSchema = Joi.object({
  id: objectId.required(),
});
