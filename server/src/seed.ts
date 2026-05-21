/* eslint-disable no-console */
import mongoose from 'mongoose';
import { config } from './config';
import { connectMongo, disconnectMongo } from './config/db';
import { User } from './models/User';
import { Restaurant } from './models/Restaurant';
import { MenuItem } from './models/MenuItem';
import { Cart } from './models/Cart';
import { Order } from './models/Order';
import { Payment } from './models/Payment';
import { Review } from './models/Review';
import { AuditLog } from './models/AuditLog';
import { Notification } from './models/Notification';
import { RefreshToken } from './models/RefreshToken';
import { hashPassword } from './utils/password';

const sampleRestaurants = [
  {
    ownerEmail: 'owner.spice@foodie.dev',
    ownerName: 'Aarav Sharma',
    name: 'Spice Symphony',
    description: 'Modern North-Indian classics with a contemporary twist.',
    cuisine: ['Indian', 'North Indian', 'Mughlai'],
    coverImage:
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
    ],
    costForTwo: 600,
    address: {
      line1: '12, MG Road',
      city: 'Faridabad',
      state: 'Haryana',
      postalCode: '121001',
      country: 'IN',
    },
    menu: [
      {
        category: 'Starters',
        items: [
          {
            name: 'Paneer Tikka',
            price: 249,
            description: 'Char-grilled cottage cheese marinated in yoghurt and spices.',
            isVeg: true,
            spicyLevel: 'medium' as const,
            imageUrl:
              'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Chicken Seekh Kebab',
            price: 329,
            description: 'Minced chicken skewers with herbs and spices.',
            isVeg: false,
            spicyLevel: 'medium' as const,
            imageUrl:
              'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80',
          },
        ],
      },
      {
        category: 'Main Course',
        items: [
          {
            name: 'Butter Chicken',
            price: 399,
            description: 'Slow-cooked chicken in a rich tomato and butter gravy.',
            isVeg: false,
            spicyLevel: 'mild' as const,
            imageUrl:
              'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Dal Makhani',
            price: 279,
            description: 'Creamy black lentils simmered overnight.',
            isVeg: true,
            imageUrl:
              'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Veg Biryani',
            price: 299,
            description: 'Long-grain basmati rice with spiced vegetables.',
            isVeg: true,
            imageUrl:
              'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
          },
        ],
      },
      {
        category: 'Breads',
        items: [
          { name: 'Butter Naan', price: 60, description: 'Soft leavened flatbread.', isVeg: true },
          { name: 'Garlic Naan', price: 80, description: 'Naan with roasted garlic.', isVeg: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          { name: 'Gulab Jamun (2 pc)', price: 120, description: 'Warm, syrupy milk dumplings.', isVeg: true },
        ],
      },
    ],
  },
  {
    ownerEmail: 'owner.pizza@foodie.dev',
    ownerName: 'Priya Verma',
    name: 'Crust & Co.',
    description: 'Wood-fired Neapolitan pizzas and Italian classics.',
    cuisine: ['Italian', 'Pizza', 'Pasta'],
    coverImage:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    ],
    costForTwo: 800,
    address: {
      line1: 'Sector 14, Crown Plaza',
      city: 'Faridabad',
      state: 'Haryana',
      postalCode: '121007',
      country: 'IN',
    },
    menu: [
      {
        category: 'Pizzas',
        items: [
          {
            name: 'Margherita',
            price: 349,
            description: 'San Marzano tomato, fior di latte, basil.',
            isVeg: true,
            imageUrl:
              'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Pepperoni',
            price: 499,
            description: 'Pepperoni, mozzarella, oregano.',
            isVeg: false,
            imageUrl:
              'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Truffle Mushroom',
            price: 599,
            description: 'Wild mushrooms with truffle oil.',
            isVeg: true,
            imageUrl:
              'https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=400&q=80',
          },
        ],
      },
      {
        category: 'Pasta',
        items: [
          {
            name: 'Spaghetti Aglio e Olio',
            price: 329,
            description: 'Garlic, chili, parsley.',
            isVeg: true,
            imageUrl:
              'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Penne Arrabbiata',
            price: 349,
            description: 'Spicy tomato sauce with chili.',
            isVeg: true,
            spicyLevel: 'hot' as const,
          },
        ],
      },
      {
        category: 'Sides',
        items: [
          { name: 'Garlic Bread', price: 159, isVeg: true },
          { name: 'Caesar Salad', price: 269, isVeg: false },
        ],
      },
    ],
  },
  {
    ownerEmail: 'owner.sushi@foodie.dev',
    ownerName: 'Rohan Kapoor',
    name: 'Sakura Sushi Bar',
    description: 'Authentic Japanese sushi and ramen.',
    cuisine: ['Japanese', 'Sushi', 'Asian'],
    coverImage:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    images: [],
    costForTwo: 1200,
    address: {
      line1: 'Sector 21, Faridabad',
      city: 'Faridabad',
      state: 'Haryana',
      postalCode: '121002',
      country: 'IN',
    },
    menu: [
      {
        category: 'Sushi',
        items: [
          {
            name: 'Salmon Nigiri (4 pc)',
            price: 549,
            description: 'Fresh salmon over hand-pressed rice.',
            isVeg: false,
            imageUrl:
              'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=400&q=80',
          },
          {
            name: 'Avocado Maki (8 pc)',
            price: 379,
            description: 'Vegetarian rolls with avocado.',
            isVeg: true,
          },
        ],
      },
      {
        category: 'Ramen',
        items: [
          {
            name: 'Tonkotsu Ramen',
            price: 489,
            description: 'Pork bone broth, chashu, soft egg.',
            isVeg: false,
          },
          {
            name: 'Veg Miso Ramen',
            price: 429,
            description: 'Miso broth with seasonal vegetables.',
            isVeg: true,
          },
        ],
      },
    ],
  },
];

async function clearAll() {
  // The model union has incompatible deleteMany overloads under strict TS;
  // call each one explicitly to keep types simple.
  await User.deleteMany({});
  await Restaurant.deleteMany({});
  await MenuItem.deleteMany({});
  await Cart.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await Review.deleteMany({});
  await AuditLog.deleteMany({});
  await Notification.deleteMany({});
  await RefreshToken.deleteMany({});
}

async function seed() {
  console.log('▶ Connecting to MongoDB:', config.mongoUri);
  await connectMongo();

  console.log('▶ Clearing existing data');
  await clearAll();

  console.log('▶ Creating users');
  const adminPwd = await hashPassword('Admin@12345');
  const ownerPwd = await hashPassword('Owner@12345');
  const customerPwd = await hashPassword('Customer@12345');

  const admin = await User.create({
    email: 'admin@foodieexpress.dev',
    passwordHash: adminPwd,
    fullName: 'Platform Admin',
    role: 'admin',
    phone: '9999999999',
    emailVerified: true,
  });

  const customer = await User.create({
    email: 'customer@foodie.dev',
    passwordHash: customerPwd,
    fullName: 'Demo Customer',
    role: 'customer',
    phone: '9988776655',
    emailVerified: true,
    addresses: [
      {
        label: 'Home',
        line1: '42, Park Avenue',
        city: 'Faridabad',
        state: 'Haryana',
        postalCode: '121001',
        country: 'IN',
        isDefault: true,
      },
    ],
  });

  for (const r of sampleRestaurants) {
    const owner = await User.create({
      email: r.ownerEmail,
      passwordHash: ownerPwd,
      fullName: r.ownerName,
      role: 'restaurant',
      emailVerified: true,
    });
    const restaurant = await Restaurant.create({
      ownerId: owner._id,
      name: r.name,
      slug: r.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      description: r.description,
      cuisine: r.cuisine,
      address: r.address,
      images: r.images,
      coverImage: r.coverImage,
      costForTwo: r.costForTwo,
      isApproved: true,
      isActive: true,
      approvalStatus: 'approved',
    });
    for (const cat of r.menu) {
      for (const it of cat.items) {
        await MenuItem.create({
          restaurantId: restaurant._id,
          category: cat.category,
          name: it.name,
          price: it.price,
          description: ('description' in it ? it.description : '') || '',
          isVeg: it.isVeg ?? true,
          available: true,
          imageUrl: 'imageUrl' in it ? it.imageUrl : undefined,
          spicyLevel: 'spicyLevel' in it ? (it as { spicyLevel: 'mild' | 'medium' | 'hot' }).spicyLevel : undefined,
        });
      }
    }
    console.log(`  ✓ Restaurant: ${r.name} (${cat_count(r)} menu items, owner ${r.ownerEmail})`);
  }

  console.log('\n✅ Seed complete.\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@foodieexpress.dev / Admin@12345');
  console.log('  Owner #1: owner.spice@foodie.dev / Owner@12345');
  console.log('  Owner #2: owner.pizza@foodie.dev / Owner@12345');
  console.log('  Owner #3: owner.sushi@foodie.dev / Owner@12345');
  console.log('  Customer: customer@foodie.dev / Customer@12345');
  console.log('');
  // Touch admin to satisfy unused warnings
  void admin._id;
  void customer._id;

  await disconnectMongo();
  await mongoose.connection.close();
}

function cat_count(r: { menu: { items: unknown[] }[] }): number {
  return r.menu.reduce((acc, c) => acc + c.items.length, 0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
