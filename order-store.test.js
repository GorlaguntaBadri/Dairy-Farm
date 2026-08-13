const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderStore, validateOrder } = require('../order-store');

test('memory store accepts a valid Palamaner order', () => {
  const store = createOrderStore();
  const created = store.create({
    name: 'Sandeep',
    phone: '9876543210',
    quantity: 3,
    deliveryDate: '2026-08-13',
    address: 'Main Road, Palamaner',
    notes: 'Morning delivery'
  });

  assert.equal(created.totalAmount, 150);
  assert.equal(created.status, 'Pending');
  assert.match(created.id, /^\d+$/);
  assert.equal(store.list().length, 1);
});

test('validation rejects orders outside Palamaner', () => {
  const error = validateOrder({
    name: 'Sandeep',
    phone: '9876543210',
    quantity: 2,
    deliveryDate: '2026-08-13',
    address: 'Kurnool town',
    notes: ''
  });

  assert.match(error, /Palamaner/i);
});
