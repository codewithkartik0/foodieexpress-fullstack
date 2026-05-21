import request from 'supertest';
import type { Express } from 'express';
import { setupTestDb, teardownTestDb, clearAllCollections } from './setup';
import { Restaurant } from '../src/models/Restaurant';
import { MenuItem } from '../src/models/MenuItem';
import { User } from '../src/models/User';
import { hashPassword } from '../src/utils/password';

let app: Express;

async function registerCustomer(email = 'cust@example.com', password = 'Password1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    fullName: 'Customer',
  });
  // Skip OTP in tests by directly verifying the user
  await User.updateOne({ email: email.toLowerCase() }, { $set: { emailVerified: true } });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return login.body.data.accessToken as string;
}

async function createRestaurantWithOwner() {
  const ownerPwd = await hashPassword('Password1!');
  const owner = await User.create({
    email: 'owner@example.com',
    fullName: 'Owner',
    passwordHash: ownerPwd,
    role: 'restaurant',
    emailVerified: true,
  });
  const restaurant = await Restaurant.create({
    ownerId: owner._id,
    name: 'Test Diner',
    slug: 'test-diner',
    cuisine: ['Indian'],
    address: { line1: '1 Main St', city: 'Faridabad', state: 'HR', postalCode: '121001', country: 'IN' },
    isApproved: true,
    isActive: true,
    approvalStatus: 'approved',
  });
  const item = await MenuItem.create({
    restaurantId: restaurant._id,
    name: 'Margherita',
    price: 300,
    category: 'Pizza',
    available: true,
  });
  const ownerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'owner@example.com', password: 'Password1!' });
  return {
    owner,
    ownerToken: ownerLogin.body.data.accessToken as string,
    restaurant,
    item,
  };
}

beforeAll(async () => {
  ({ app } = await setupTestDb());
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearAllCollections();
});

describe('RBAC', () => {
  it('forbids customers from creating menu items', async () => {
    const token = await registerCustomer();
    const res = await request(app)
      .post('/api/v1/menu-items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurantId: '0123456789abcdef01234567',
        name: 'Pizza',
        price: 100,
        category: 'X',
      });
    expect(res.status).toBe(403);
  });

  it('forbids customers from accessing platform admin routes', async () => {
    const token = await registerCustomer();
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('Cart and Order lifecycle', () => {
  it('places an order from the cart and clears it', async () => {
    const { item } = await createRestaurantWithOwner();
    const token = await registerCustomer('shopper@example.com');

    // Add to cart
    const add = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item.id, quantity: 2 });
    expect(add.status).toBe(200);
    expect(add.body.data.items.length).toBe(1);
    expect(add.body.data.pricing.subtotal).toBe(600);

    // Place order
    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'cod',
        deliveryAddress: {
          fullName: 'Shopper',
          phone: '9988776655',
          line1: '1 Demo',
          city: 'Faridabad',
          state: 'Haryana',
          postalCode: '121001',
          country: 'IN',
        },
      });
    expect(order.status).toBe(201);
    expect(order.body.data.status).toBe('placed');
    // subtotal 600 + tax 5% (30) + delivery 0 (waived ≥ ₹499) = 630
    expect(order.body.data.total).toBe(630);
    expect(order.body.data.subtotal).toBe(600);
    expect(order.body.data.tax).toBe(30);
    expect(order.body.data.deliveryFee).toBe(0);

    // Cart should now be empty
    const cart = await request(app).get('/api/v1/cart').set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.items.length).toBe(0);
  });

  it('rejects placing an order from empty cart', async () => {
    const token = await registerCustomer('empty@example.com');
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'cod',
        deliveryAddress: {
          fullName: 'Empty Cart',
          phone: '9988776655',
          line1: '1 Demo',
          city: 'Faridabad',
          state: 'Haryana',
          postalCode: '121001',
          country: 'IN',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_CART');
  });

  it('progresses order through valid status transitions and rejects invalid ones', async () => {
    const { item, ownerToken } = await createRestaurantWithOwner();
    const custToken = await registerCustomer('flow@example.com');

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ menuItemId: item.id, quantity: 1 });
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        paymentMethod: 'cod',
        deliveryAddress: {
          fullName: 'Flow Tester',
          phone: '9988776655',
          line1: '1 Demo',
          city: 'Faridabad',
          state: 'Haryana',
          postalCode: '121001',
          country: 'IN',
        },
      });
    const orderId = placed.body.data._id;

    const accept = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'accepted' });
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe('accepted');

    // Invalid: can't go from accepted -> delivered (must go preparing first)
    const bad = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'delivered' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('does not let one customer read another customer\'s order', async () => {
    const { item } = await createRestaurantWithOwner();
    const t1 = await registerCustomer('a@example.com');
    const t2 = await registerCustomer('b@example.com');

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${t1}`)
      .send({ menuItemId: item.id, quantity: 1 });
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${t1}`)
      .send({
        paymentMethod: 'cod',
        deliveryAddress: {
          fullName: 'Customer A',
          phone: '9988776655',
          line1: '1 First St',
          city: 'Faridabad',
          state: 'Haryana',
          postalCode: '121001',
          country: 'IN',
        },
      });
    const orderId = placed.body.data._id;

    const peek = await request(app).get(`/api/v1/orders/${orderId}`).set('Authorization', `Bearer ${t2}`);
    expect(peek.status).toBe(404);
  });
});

describe('Payments (dev mock)', () => {
  it('creates a mock PaymentIntent and lets dev mark-paid mark order paid', async () => {
    const { item } = await createRestaurantWithOwner();
    const token = await registerCustomer('pay@example.com');

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item.id, quantity: 1 });
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'stripe',
        deliveryAddress: {
          fullName: 'Pay Tester',
          phone: '9988776655',
          line1: '1 Demo',
          city: 'Faridabad',
          state: 'Haryana',
          postalCode: '121001',
          country: 'IN',
        },
      });
    const orderId = placed.body.data._id;

    const intent = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });
    expect(intent.status).toBe(200);
    expect(intent.body.data.clientSecret).toMatch(/^dev_mock_secret_/);

    const paid = await request(app)
      .post('/api/v1/payments/dev/mark-paid')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: intent.body.data.paymentId });
    expect(paid.status).toBe(200);

    const after = await request(app).get(`/api/v1/orders/${orderId}`).set('Authorization', `Bearer ${token}`);
    expect(after.body.data.paymentStatus).toBe('paid');
  });
});
