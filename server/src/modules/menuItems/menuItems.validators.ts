import Joi from 'joi';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const createMenuItemSchema = Joi.object({
  restaurantId: objectId.required(),
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(500).optional().allow(''),
  price: Joi.number().min(0).max(100000).required(),
  category: Joi.string().min(2).max(60).required(),
  imageUrl: Joi.string().uri().optional().allow(''),
  isVeg: Joi.boolean().default(true),
  available: Joi.boolean().default(true),
  spicyLevel: Joi.string().valid('mild', 'medium', 'hot').optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).default([]),
});

export const updateMenuItemSchema = createMenuItemSchema.fork(
  ['restaurantId', 'name', 'price', 'category'],
  (s) => s.optional(),
);

export const listMenuQuerySchema = Joi.object({
  restaurantId: objectId.optional(),
  category: Joi.string().max(60).optional(),
  available: Joi.string().valid('true', 'false').optional(),
  q: Joi.string().max(100).optional(),
});

export const idParamSchema = Joi.object({
  id: objectId.required(),
});
