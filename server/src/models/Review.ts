import { Schema, model, Document, Types } from 'mongoose';

export interface ReviewDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  restaurantId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, strict: true },
);

reviewSchema.index({ restaurantId: 1, createdAt: -1 });

export const Review = model<ReviewDoc>('Review', reviewSchema);
