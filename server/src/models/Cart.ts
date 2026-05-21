import { Schema, model, Document, Types } from 'mongoose';

export interface CartItemSubdoc {
  _id?: Types.ObjectId;
  menuItemId: Types.ObjectId;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  isVeg?: boolean;
}

export interface CartDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  restaurantId?: Types.ObjectId | null;
  items: CartItemSubdoc[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemSubdoc>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    imageUrl: { type: String },
    isVeg: { type: Boolean },
  },
  { _id: true },
);

const cartSchema = new Schema<CartDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true, strict: true },
);

export const Cart = model<CartDoc>('Cart', cartSchema);
