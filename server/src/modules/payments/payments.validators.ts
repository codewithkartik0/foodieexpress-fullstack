import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const createIntentSchema = Joi.object({
  orderId: objectId.required(),
});

export const devMarkPaidSchema = Joi.object({
  paymentId: objectId.required(),
});
