import Joi from 'joi';

const hourSchema = Joi.object({
  open: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .default('10:00'),
  close: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .default('22:00'),
  closed: Joi.boolean().default(false),
});

export const createRestaurantSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(500).optional().allow(''),
  cuisine: Joi.array().items(Joi.string().min(2).max(40)).max(10).default([]),
  costForTwo: Joi.number().min(0).max(100000).default(400),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default('IN'),
    geo: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).required(),
  openingHours: Joi.object({
    mon: hourSchema,
    tue: hourSchema,
    wed: hourSchema,
    thu: hourSchema,
    fri: hourSchema,
    sat: hourSchema,
    sun: hourSchema,
  }).optional(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  coverImage: Joi.string().uri().optional().allow(''),
});

export const updateRestaurantSchema = createRestaurantSchema
  .fork(['name', 'address'], (s) => s.optional())
  .keys({
    isActive: Joi.boolean().optional(),
  });

export const listRestaurantsQuerySchema = Joi.object({
  q: Joi.string().max(100).optional(),
  city: Joi.string().max(80).optional(),
  cuisine: Joi.string().max(40).optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(20),
  sort: Joi.string().valid('rating', 'name', 'newest').default('newest'),
});

export const idParamSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
});
