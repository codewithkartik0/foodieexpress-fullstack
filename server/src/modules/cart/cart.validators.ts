import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const addItemSchema = Joi.object({
  menuItemId: objectId.required(),
  quantity: Joi.number().integer().min(1).max(99).default(1),
});

export const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(99).required(),
});

export const idParamSchema = Joi.object({
  id: objectId.required(),
});
