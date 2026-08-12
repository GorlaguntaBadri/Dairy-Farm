function createOrderStore() {
  const orders = [];

  function generateId() {
    const timestamp = Date.now().toString();
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    return `${timestamp}${randomPart}`;
  }

  return {
    list() {
      return [...orders];
    },
    create(data) {
      const quantity = Number(data.quantity);
      const order = {
        id: generateId(),
        name: String(data.name || '').trim(),
        phone: String(data.phone || ''),
        quantity,
        pricePerLitre: 50,
        totalAmount: quantity * 50,
        deliveryDate: data.deliveryDate,
        address: String(data.address || '').trim(),
        notes: String(data.notes || '').trim(),
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      orders.unshift(order);
      return order;
    },
    updateStatus(id, status) {
      const index = orders.findIndex((o) => o.id === id);
      if (index === -1) return null;
      orders[index].status = status;
      orders[index].updatedAt = new Date();
      return orders[index];
    },
    count() {
      return orders.length;
    }
  };
}

function validateOrder(body) {
  const { name, phone, quantity, deliveryDate, address } = body;
  if (!name || name.trim().length < 2) return 'Name is required.';
  if (!/^[6-9]\d{9}$/.test(String(phone || ''))) return 'Valid 10-digit Indian mobile number is required.';
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 50) return 'Quantity must be between 1 and 50 litres.';
  if (!deliveryDate || Number.isNaN(new Date(`${deliveryDate}T00:00:00`).getTime())) return 'Valid delivery date is required.';
  const d = new Date(`${deliveryDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'Delivery date cannot be in the past.';
  if (!address || address.trim().length < 5) return 'Delivery address is required.';
  if (!/palamaner/i.test(address)) return 'Booking is available only in Palamaner.';
  return null;
}

module.exports = { createOrderStore, validateOrder };
