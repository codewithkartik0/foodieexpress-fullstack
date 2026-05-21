import { Schema, model, Document, Types } from 'mongoose';

export interface MenuItemDoc extends Document {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isVeg: boolean;
  available: boolean;
  spicyLevel?: 'mild' | 'medium' | 'hot';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<MenuItemDoc>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, index: true },
    imageUrl: { type: String, trim: true },
    isVeg: { type: Boolean, default: true },
    available: { type: Boolean, default: true, index: true },
    spicyLevel: { type: String, enum: ['mild', 'medium', 'hot'] },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, strict: true },
);

menuItemSchema.index({ restaurantId: 1, category: 1, available: 1 });
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const MenuItem = model<MenuItemDoc>('MenuItem', menuItemSchema);
