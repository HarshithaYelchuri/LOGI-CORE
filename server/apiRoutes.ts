import express from 'express';
import { db } from './db';
import {
  calculateOrderRate,
  detectZone,
  calculateHaversineDistance,
  estimateUrbanEtaMinutes,
  getCoordinatesForZoneOrPostal,
} from './rateEngine';
import { autoAssignOrder, assignAgentToOrder, findEligibleAgentsForOrder } from './assignmentEngine';
import { createNotificationForEvent } from './notificationEngine';
import { broadcastEvent } from './wsServer';
import {
  Order,
  OrderAddress,
  OrderStatusHistory,
  DeliveryAttempt,
  Reschedule,
  RateCalculationInput,
  OrderStatusCode,
} from '../src/types';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// ==========================================
// 1. AUTHENTICATION & DEMO SWITCHER
// ==========================================

apiRouter.get('/auth/users', (req, res) => {
  const allUsers = Array.from(db.users.values()).map((u) => {
    let customer = db.customers.get(u.id);
    let agent = db.delivery_agents.get(u.id);
    return {
      ...u,
      customer,
      agent: agent ? { ...agent, zone: db.zones.get(agent.current_zone_id) } : undefined,
    };
  });
  res.json(allUsers);
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, role, user_id } = req.body;
  let user = user_id ? db.users.get(user_id) : null;
  if (!user && email) {
    user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }
  if (!user && role) {
    user = Array.from(db.users.values()).find((u) => u.role === role) || null;
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.last_login_at = new Date().toISOString();
  const customer = db.customers.get(user.id);
  const agent = db.delivery_agents.get(user.id);

  res.json({
    user,
    customer,
    agent: agent ? { ...agent, zone: db.zones.get(agent.current_zone_id) } : undefined,
  });
});

apiRouter.post('/auth/register', (req, res) => {
  const { name, email, phone, role, default_address, city, state, postal_code, vehicle_type } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  const existing = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const now = new Date().toISOString();
  const userId = `usr-${role.toLowerCase().substring(0, 4)}-${Date.now()}`;
  const newUser = {
    id: userId,
    role,
    name,
    email,
    phone: phone || '+919800000000',
    is_active: true,
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };
  db.users.set(userId, newUser);

  if (role === 'CUSTOMER') {
    const cust = {
      user_id: userId,
      default_address: default_address || 'Address Line 1',
      city: city || 'Hyderabad',
      state: state || 'Telangana',
      postal_code: postal_code || '500081',
      created_at: now,
    };
    db.customers.set(userId, cust);
  } else if (role === 'DELIVERY_AGENT') {
    const defaultZone = db.zones.get('zone-west') || Array.from(db.zones.values())[0];
    const coords = getCoordinatesForZoneOrPostal(defaultZone?.id || 'zone-west');
    const da = {
      user_id: userId,
      employee_code: `AGT-HYD-${Math.floor(100 + Math.random() * 900)}`,
      vehicle_type: vehicle_type || 'Standard Two-Wheeler',
      availability_status: 'AVAILABLE' as const,
      current_latitude: coords.lat,
      current_longitude: coords.lng,
      current_zone_id: defaultZone?.id || 'zone-west',
      last_location_at: now,
      created_at: now,
      updated_at: now,
    };
    db.delivery_agents.set(userId, da);
  }

  res.json({ user: newUser });
});

// ==========================================
// 2. ZONES & ZONE AREAS MANAGEMENT
// ==========================================

apiRouter.get('/zones', (req, res) => {
  const zones = Array.from(db.zones.values()).map((z) => {
    const areas = Array.from(db.zone_areas.values()).filter((a) => a.zone_id === z.id && a.is_active);
    return {
      ...z,
      areas_count: areas.length,
      areas,
    };
  });
  res.json(zones);
});

apiRouter.post('/zones', (req, res) => {
  const { zone_code, zone_name, description, is_active } = req.body;
  if (!zone_code || !zone_name) {
    return res.status(400).json({ error: 'Zone code and Zone name are required' });
  }

  const id = `zone-${zone_code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const now = new Date().toISOString();
  const newZone = {
    id,
    zone_code,
    zone_name,
    description: description || '',
    is_active: is_active ?? true,
    created_at: now,
    updated_at: now,
  };
  db.zones.set(id, newZone);
  res.json(newZone);
});

apiRouter.put('/zones/:id', (req, res) => {
  const z = db.zones.get(req.params.id);
  if (!z) return res.status(404).json({ error: 'Zone not found' });

  const { zone_code, zone_name, description, is_active } = req.body;
  if (zone_code) z.zone_code = zone_code;
  if (zone_name) z.zone_name = zone_name;
  if (description !== undefined) z.description = description;
  if (is_active !== undefined) z.is_active = is_active;
  z.updated_at = new Date().toISOString();

  res.json(z);
});

apiRouter.get('/zone-areas', (req, res) => {
  const areas = Array.from(db.zone_areas.values()).map((a) => ({
    ...a,
    zone: db.zones.get(a.zone_id),
  }));
  res.json(areas);
});

apiRouter.post('/zone-areas', (req, res) => {
  const { zone_id, area_name, postal_code, city, state } = req.body;
  if (!zone_id || !area_name || !postal_code) {
    return res.status(400).json({ error: 'Zone, area name, and postal code are required' });
  }

  const id = `za-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const newArea = {
    id,
    zone_id,
    area_name,
    postal_code,
    city: city || 'Hyderabad',
    state: state || 'Telangana',
    is_active: true,
    created_at: new Date().toISOString(),
  };
  db.zone_areas.set(id, newArea);
  res.json({ ...newArea, zone: db.zones.get(zone_id) });
});

apiRouter.delete('/zone-areas/:id', (req, res) => {
  const area = db.zone_areas.get(req.params.id);
  if (!area) return res.status(404).json({ error: 'Area mapping not found' });
  db.zone_areas.delete(req.params.id);
  res.json({ success: true, id: req.params.id });
});

apiRouter.post('/zones/detect', (req, res) => {
  const { postal_code, area_name, zone_id } = req.body;
  const result = detectZone({ postal_code, area_name, zone_id });
  res.json(result);
});

// ==========================================
// 3. RATE CARDS & PRICING CONFIGURATION
// ==========================================

apiRouter.get('/rate-cards', (req, res) => {
  const cards = Array.from(db.rate_cards.values());
  res.json(cards);
});

apiRouter.post('/rate-cards', (req, res) => {
  const { rate_card_name, order_type, effective_from, effective_to, is_active } = req.body;
  const id = `rc-${order_type.toLowerCase()}-${Date.now()}`;
  const now = new Date().toISOString();
  const card = {
    id,
    rate_card_name,
    order_type,
    effective_from: effective_from || '2026-01-01T00:00:00Z',
    effective_to: effective_to || '2028-12-31T23:59:59Z',
    is_active: is_active ?? true,
    created_at: now,
    updated_at: now,
  };
  db.rate_cards.set(id, card);
  res.json(card);
});

apiRouter.get('/zone-rates', (req, res) => {
  const rates = Array.from(db.zone_rates.values()).map((zr) => ({
    ...zr,
    pickup_zone: db.zones.get(zr.pickup_zone_id),
    drop_zone: db.zones.get(zr.drop_zone_id),
    rate_card: db.rate_cards.get(zr.rate_card_id),
  }));
  res.json(rates);
});

apiRouter.post('/zone-rates', (req, res) => {
  const { rate_card_id, pickup_zone_id, drop_zone_id, weight_min, weight_max, rate_per_order, fixed_charge } = req.body;
  if (!rate_card_id || !pickup_zone_id || !drop_zone_id) {
    return res.status(400).json({ error: 'Missing required rate parameters' });
  }

  // Check if existing
  let target: any = null;
  for (const zr of db.zone_rates.values()) {
    if (
      zr.rate_card_id === rate_card_id &&
      zr.pickup_zone_id === pickup_zone_id &&
      zr.drop_zone_id === drop_zone_id
    ) {
      target = zr;
      break;
    }
  }

  const now = new Date().toISOString();
  if (target) {
    target.weight_min = Number(weight_min) || 0;
    target.weight_max = Number(weight_max) || 50;
    target.rate_per_order = Number(rate_per_order);
    target.fixed_charge = Number(fixed_charge);
    target.updated_at = now;
    return res.json(target);
  }

  const id = `zr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const newZr = {
    id,
    rate_card_id,
    pickup_zone_id,
    drop_zone_id,
    weight_min: Number(weight_min) || 0,
    weight_max: Number(weight_max) || 50,
    rate_per_order: Number(rate_per_order) || 15,
    fixed_charge: Number(fixed_charge) || 50,
    created_at: now,
    updated_at: now,
  };
  db.zone_rates.set(id, newZr);
  res.json(newZr);
});

apiRouter.get('/cod-surcharges', (req, res) => {
  const cods = Array.from(db.cod_surcharges.values()).map((cs) => ({
    ...cs,
    rate_card: db.rate_cards.get(cs.rate_card_id),
  }));
  res.json(cods);
});

apiRouter.post('/cod-surcharges', (req, res) => {
  const { rate_card_id, order_type, surcharge_type, surcharge_value, minimum_charge, maximum_charge, is_active } = req.body;
  const id = `cod-${order_type.toLowerCase()}-${Date.now()}`;
  const rule = {
    id,
    rate_card_id,
    order_type,
    surcharge_type,
    surcharge_value: Number(surcharge_value),
    minimum_charge: Number(minimum_charge),
    maximum_charge: Number(maximum_charge),
    effective_from: '2026-01-01T00:00:00Z',
    effective_to: '2028-12-31T23:59:59Z',
    is_active: is_active ?? true,
  };
  db.cod_surcharges.set(id, rule);
  res.json(rule);
});

// Real-Time Price Calculation Engine Endpoint
apiRouter.post('/pricing/calculate', (req, res) => {
  try {
    const input: RateCalculationInput = req.body;
    const result = calculateOrderRate(input);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Rate calculation failed' });
  }
});

// ==========================================
// 4. ORDERS & DISPATCH WORKFLOW
// ==========================================

apiRouter.get('/orders', (req, res) => {
  let orders = db.getAllPopulatedOrders();
  const { status, zone_id, agent_id, customer_id, order_type, search } = req.query;

  if (status) {
    orders = orders.filter((o) => o.current_status === status);
  }
  if (zone_id) {
    orders = orders.filter((o) => o.pickup_zone_id === zone_id || o.drop_zone_id === zone_id);
  }
  if (agent_id) {
    orders = orders.filter((o) => o.current_assignment?.agent_id === agent_id);
  }
  if (customer_id) {
    orders = orders.filter((o) => o.customer_id === customer_id);
  }
  if (order_type) {
    orders = orders.filter((o) => o.order_type === order_type);
  }
  if (search) {
    const q = String(search).toLowerCase();
    orders = orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer?.user?.name.toLowerCase().includes(q) ||
        o.pickup_address?.contact_name.toLowerCase().includes(q) ||
        o.drop_address?.contact_name.toLowerCase().includes(q)
    );
  }

  res.json(orders);
});

apiRouter.get('/orders/:id', (req, res) => {
  const order = db.getPopulatedOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Order Creation Flow
apiRouter.post('/orders/create', (req, res) => {
  try {
    const {
      customer_id,
      created_by,
      order_type,
      payment_type,
      length,
      breadth,
      height,
      actual_weight,
      auto_assign,
      pickup,
      drop,
    } = req.body;

    if (!customer_id || !pickup || !drop) {
      return res.status(400).json({ error: 'Customer ID, pickup details, and drop details are required' });
    }

    // Step 1: Execute Rate Calculation Engine
    const rateCalc = calculateOrderRate({
      pickup_postal_code: pickup.postal_code,
      pickup_area: pickup.area,
      pickup_zone_id: pickup.zone_id,
      drop_postal_code: drop.postal_code,
      drop_area: drop.area,
      drop_zone_id: drop.zone_id,
      length: Number(length) || 20,
      breadth: Number(breadth) || 15,
      height: Number(height) || 10,
      actual_weight: Number(actual_weight) || 1.0,
      order_type: order_type || 'B2C',
      payment_type: payment_type || 'PREPAID',
    });

    const now = new Date().toISOString();
    const orderNum = `LM-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}`;

    // Step 2: Create Order Record
    const order: Order = {
      id: orderId,
      order_number: orderNum,
      customer_id,
      created_by: created_by || customer_id,
      order_type: order_type || 'B2C',
      payment_type: payment_type || 'PREPAID',
      actual_weight: Number(actual_weight) || 1.0,
      length: Number(length) || 20,
      breadth: Number(breadth) || 15,
      height: Number(height) || 10,
      volumetric_weight: rateCalc.volumetric_weight,
      chargeable_weight: rateCalc.chargeable_weight,
      pickup_zone_id: rateCalc.pickup_zone.id,
      drop_zone_id: rateCalc.drop_zone.id,
      pickup_to_drop_distance_km: rateCalc.pickup_to_drop_distance_km,
      pickup_to_drop_eta_min: rateCalc.pickup_to_drop_eta_min,
      base_charge: rateCalc.base_charge,
      cod_surcharge: rateCalc.cod_surcharge,
      total_charge: rateCalc.total_charge,
      current_status: 'CONFIRMED', // Immediately confirmed on quote acceptance
      confirmed_at: now,
      created_at: now,
      updated_at: now,
    };
    db.orders.set(orderId, order);

    // Step 3: Create Addresses
    const pCoords = getCoordinatesForZoneOrPostal(rateCalc.pickup_zone.id, pickup.postal_code);
    const dCoords = getCoordinatesForZoneOrPostal(rateCalc.drop_zone.id, drop.postal_code);

    const pickupAddr: OrderAddress = {
      id: `addr-${orderId}-p`,
      order_id: orderId,
      address_type: 'PICKUP',
      contact_name: pickup.contact_name || 'Sender',
      contact_phone: pickup.contact_phone || '+919800000000',
      address_line_1: pickup.address_line_1 || 'Address Line 1',
      address_line_2: pickup.address_line_2,
      area: pickup.area || 'Area',
      city: pickup.city || 'Hyderabad',
      state: pickup.state || 'Telangana',
      postal_code: pickup.postal_code || '500081',
      latitude: pCoords.lat,
      longitude: pCoords.lng,
      zone_id: rateCalc.pickup_zone.id,
      created_at: now,
    };
    db.order_addresses.set(pickupAddr.id, pickupAddr);

    const dropAddr: OrderAddress = {
      id: `addr-${orderId}-d`,
      order_id: orderId,
      address_type: 'DROP',
      contact_name: drop.contact_name || 'Recipient',
      contact_phone: drop.contact_phone || '+919800000000',
      address_line_1: drop.address_line_1 || 'Destination Address',
      address_line_2: drop.address_line_2,
      area: drop.area || 'Area',
      city: drop.city || 'Hyderabad',
      state: drop.state || 'Telangana',
      postal_code: drop.postal_code || '500034',
      latitude: dCoords.lat,
      longitude: dCoords.lng,
      zone_id: rateCalc.drop_zone.id,
      created_at: now,
    };
    db.order_addresses.set(dropAddr.id, dropAddr);

    // Step 4: Record Status History
    db.order_status_history.set(`hist-${orderId}-1`, {
      id: `hist-${orderId}-1`,
      order_id: orderId,
      old_status: null,
      new_status: 'CREATED',
      changed_by: created_by || customer_id,
      changed_at: now,
      remarks: `Order booked with chargeable weight of ${rateCalc.chargeable_weight} kg (Volumetric: ${rateCalc.volumetric_weight}kg, Actual: ${actual_weight}kg). Total Quote: ₹${rateCalc.total_charge}`,
    });

    db.order_status_history.set(`hist-${orderId}-2`, {
      id: `hist-${orderId}-2`,
      order_id: orderId,
      old_status: 'CREATED',
      new_status: 'CONFIRMED',
      changed_by: created_by || customer_id,
      changed_at: now,
      remarks: `Payment mode: ${payment_type || 'PREPAID'} (Base ₹${rateCalc.base_charge} + COD ₹${rateCalc.cod_surcharge})`,
    });

    // Step 5: Notification to Customer
    createNotificationForEvent({
      order_id: orderId,
      user_id: customer_id,
      event_type: 'ORDER_CONFIRMED',
      subject: `Order #${orderNum} Confirmed - ₹${rateCalc.total_charge}`,
      message: `Your last-mile delivery order #${orderNum} is confirmed from ${rateCalc.pickup_zone.zone_name} to ${rateCalc.drop_zone.zone_name}. Estimated distance: ${rateCalc.pickup_to_drop_distance_km} km. Total charges: ₹${rateCalc.total_charge}.`,
    });

    // Step 6: If auto_assign requested, trigger intelligent assignment immediately!
    if (auto_assign) {
      try {
        autoAssignOrder(orderId, created_by || customer_id);
      } catch (assignErr) {
        console.warn('Auto-assign on creation note:', assignErr);
      }
    }

    broadcastEvent({
      type: 'ORDER_CREATED',
      payload: { order_id: orderId, order_number: orderNum, total_charge: rateCalc.total_charge },
    });

    const populated = db.getPopulatedOrder(orderId);
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// Update Order Status (Rider standard workflow)
apiRouter.post('/orders/:id/status', (req, res) => {
  const { status, changed_by, remarks } = req.body;
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const oldStatus = order.current_status;
  const now = new Date().toISOString();

  order.current_status = status as OrderStatusCode;
  order.updated_at = now;

  // Add to immutable audit history
  const historyId = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const hist: OrderStatusHistory = {
    id: historyId,
    order_id: order.id,
    old_status: oldStatus,
    new_status: status as OrderStatusCode,
    changed_by: changed_by || 'usr-admin-1',
    changed_at: now,
    remarks: remarks || `Status updated from ${oldStatus} to ${status}`,
  };
  db.order_status_history.set(historyId, hist);

  // If status is DELIVERED -> mark assignment completed, set agent to AVAILABLE
  if (status === 'DELIVERED') {
    for (const asgn of db.order_assignments.values()) {
      if (asgn.order_id === order.id && asgn.is_current) {
        const agent = db.delivery_agents.get(asgn.agent_id);
        if (agent) {
          agent.availability_status = 'AVAILABLE';
          agent.updated_at = now;
        }
      }
    }

    createNotificationForEvent({
      order_id: order.id,
      user_id: order.customer_id,
      event_type: 'ORDER_DELIVERED',
      subject: `Package Delivered: Order #${order.order_number}`,
      message: `Your package #${order.order_number} was successfully delivered. Thank you for choosing our delivery network!`,
    });
  } else {
    createNotificationForEvent({
      order_id: order.id,
      user_id: order.customer_id,
      event_type: `STATUS_${status}`,
      subject: `Update on Order #${order.order_number}: ${status.replace(/_/g, ' ')}`,
      message: `Your order #${order.order_number} is now ${status.replace(/_/g, ' ')}. ${remarks ? `Note: ${remarks}` : ''}`,
    });
  }

  broadcastEvent({
    type: 'ORDER_STATUS_CHANGED',
    payload: { order_id: order.id, order_number: order.order_number, old_status: oldStatus, new_status: status, remarks },
  });

  res.json(db.getPopulatedOrder(order.id));
});

// Admin Status Override
apiRouter.post('/orders/:id/override-status', (req, res) => {
  const { new_status, changed_by, reason } = req.body;
  if (!new_status || !reason) {
    return res.status(400).json({ error: 'New status and override reason are required' });
  }

  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const oldStatus = order.current_status;
  const now = new Date().toISOString();
  order.current_status = new_status;
  order.updated_at = now;

  const historyId = `hist-override-${Date.now()}`;
  db.order_status_history.set(historyId, {
    id: historyId,
    order_id: order.id,
    old_status: oldStatus,
    new_status: new_status,
    changed_by: changed_by || 'usr-admin-1',
    changed_at: now,
    remarks: `[ADMIN OVERRIDE] ${reason}`,
  });

  createNotificationForEvent({
    order_id: order.id,
    user_id: order.customer_id,
    event_type: 'ADMIN_OVERRIDE',
    subject: `Order #${order.order_number} Status Adjusted`,
    message: `The status of order #${order.order_number} was updated to ${new_status} by dispatch administration. Reason: ${reason}`,
  });

  broadcastEvent({
    type: 'ORDER_STATUS_CHANGED',
    payload: { order_id: order.id, order_number: order.order_number, old_status: oldStatus, new_status, is_override: true },
  });

  res.json(db.getPopulatedOrder(order.id));
});

// ==========================================
// 5. FAILED DELIVERY & RESCHEDULE FLOW
// ==========================================

apiRouter.post('/orders/:id/fail-attempt', (req, res) => {
  const { agent_id, failure_reason, remarks } = req.body;
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  const oldStatus = order.current_status;

  // 1. Calculate attempt number
  let attemptCount = 0;
  for (const att of db.delivery_attempts.values()) {
    if (att.order_id === order.id) attemptCount++;
  }
  const attemptNumber = attemptCount + 1;

  // 2. Create Delivery Attempt Record
  const attemptId = `att-${order.id}-${attemptNumber}`;
  const attempt: DeliveryAttempt = {
    id: attemptId,
    order_id: order.id,
    attempt_number: attemptNumber,
    agent_id: agent_id || 'usr-agent-1',
    scheduled_date: now.split('T')[0],
    started_at: order.confirmed_at || now,
    completed_at: now,
    outcome: 'FAILED',
    failure_reason: failure_reason || 'Customer Unavailable / Premises Locked',
    remarks: remarks || 'Delivery attempt failed on route.',
    created_at: now,
  };
  db.delivery_attempts.set(attemptId, attempt);

  // 3. Update order status to FAILED
  order.current_status = 'FAILED';
  order.updated_at = now;

  // 4. Free up agent
  if (agent_id) {
    const da = db.delivery_agents.get(agent_id);
    if (da) {
      da.availability_status = 'AVAILABLE';
      da.updated_at = now;
    }
  }

  // 5. Immutable status history entry
  const historyId = `hist-fail-${Date.now()}`;
  db.order_status_history.set(historyId, {
    id: historyId,
    order_id: order.id,
    old_status: oldStatus,
    new_status: 'FAILED',
    changed_by: agent_id || 'usr-agent-1',
    changed_at: now,
    remarks: `Attempt #${attemptNumber} Failed: ${attempt.failure_reason}. ${remarks ? `(${remarks})` : ''} Prompting customer for reschedule.`,
  });

  // 6. Send critical alert to customer via Email & SMS
  createNotificationForEvent({
    order_id: order.id,
    user_id: order.customer_id,
    event_type: 'FAILED_DELIVERY',
    notification_type: 'EMAIL',
    subject: `Delivery Attempt #${attemptNumber} Failed for Order #${order.order_number}`,
    message: `We were unable to deliver your package #${order.order_number} today. Reason: ${attempt.failure_reason}. Please open the tracker to pick your preferred reschedule slot.`,
  });

  broadcastEvent({
    type: 'ORDER_FAILED_ATTEMPT',
    payload: {
      order_id: order.id,
      order_number: order.order_number,
      attempt_number: attemptNumber,
      reason: attempt.failure_reason,
    },
  });

  res.json(db.getPopulatedOrder(order.id));
});

// Reschedule Order (Customer or Dispatcher picks new date)
apiRouter.post('/orders/:id/reschedule', (req, res) => {
  const { requested_date, reason, requested_by, auto_reassign } = req.body;
  if (!requested_date) {
    return res.status(400).json({ error: 'Requested reschedule date is required' });
  }

  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  const oldStatus = order.current_status;

  // Find latest failed attempt ID
  let latestAttemptId = '';
  for (const att of db.delivery_attempts.values()) {
    if (att.order_id === order.id && att.outcome === 'FAILED') {
      latestAttemptId = att.id;
    }
  }

  const rescheduleId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const rescheduleRecord: Reschedule = {
    id: rescheduleId,
    order_id: order.id,
    delivery_attempt_id: latestAttemptId,
    requested_by: requested_by || order.customer_id,
    requested_date,
    reason: reason || 'Customer requested rescheduled delivery date',
    status: 'APPROVED',
    created_at: now,
  };
  db.reschedules.set(rescheduleId, rescheduleRecord);

  // Transition order status to RESCHEDULED
  order.current_status = 'RESCHEDULED';
  order.updated_at = now;

  // Status History
  const historyId = `hist-resched-${Date.now()}`;
  db.order_status_history.set(historyId, {
    id: historyId,
    order_id: order.id,
    old_status: oldStatus,
    new_status: 'RESCHEDULED',
    changed_by: requested_by || order.customer_id,
    changed_at: now,
    remarks: `Order rescheduled for delivery on ${requested_date}. Reason: ${rescheduleRecord.reason}`,
  });

  // Notification
  createNotificationForEvent({
    order_id: order.id,
    user_id: order.customer_id,
    event_type: 'ORDER_RESCHEDULED',
    subject: `Rescheduled: Order #${order.order_number} booked for ${requested_date}`,
    message: `Your package #${order.order_number} has been rescheduled for delivery on ${requested_date}. A delivery agent will be allocated.`,
  });

  // Re-assign agent if auto_reassign is requested
  if (auto_reassign) {
    try {
      autoAssignOrder(order.id, requested_by || 'usr-admin-1');
    } catch (err) {
      console.warn('Auto re-assign note:', err);
    }
  }

  broadcastEvent({
    type: 'ORDER_RESCHEDULED',
    payload: {
      order_id: order.id,
      order_number: order.order_number,
      rescheduled_date: requested_date,
      status: order.current_status,
    },
  });

  res.json(db.getPopulatedOrder(order.id));
});

// ==========================================
// 6. AGENTS & ASSIGNMENTS
// ==========================================

apiRouter.get('/agents', (req, res) => {
  res.json(db.getPopulatedAgents());
});

apiRouter.get('/assignments/candidates/:orderId', (req, res) => {
  try {
    const candidates = findEligibleAgentsForOrder(req.params.orderId);
    res.json(candidates);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/assignments/assign', (req, res) => {
  try {
    const { order_id, agent_id, assigned_by, reason } = req.body;
    const assignment = assignAgentToOrder({
      order_id,
      agent_id,
      assignment_type: 'MANUAL',
      assigned_by: assigned_by || 'usr-admin-1',
      reason,
    });
    res.json({ assignment, order: db.getPopulatedOrder(order_id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/assignments/auto-assign/:orderId', (req, res) => {
  try {
    const { assigned_by } = req.body;
    const assignment = autoAssignOrder(req.params.orderId, assigned_by || 'usr-admin-1');
    res.json({ assignment, order: db.getPopulatedOrder(req.params.orderId) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Dynamic Rider GPS location update & recalculation
apiRouter.post('/agents/:id/location', (req, res) => {
  const { latitude, longitude, zone_id } = req.body;
  const agent = db.delivery_agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Delivery agent not found' });

  const now = new Date().toISOString();
  agent.current_latitude = Number(latitude);
  agent.current_longitude = Number(longitude);
  if (zone_id) agent.current_zone_id = zone_id;
  agent.last_location_at = now;
  agent.updated_at = now;

  // Log in agent_locations
  const locId = `loc-${Date.now()}`;
  db.agent_locations.set(locId, {
    id: locId,
    agent_id: agent.user_id,
    latitude: agent.current_latitude,
    longitude: agent.current_longitude,
    zone_id: agent.current_zone_id,
    recorded_at: now,
  });

  // Check if agent has an active current order assignment and dynamically update rider->pickup ETA
  for (const asgn of db.order_assignments.values()) {
    if (asgn.agent_id === agent.user_id && asgn.is_current) {
      const order = db.orders.get(asgn.order_id);
      if (order && (order.current_status === 'ASSIGNED' || order.current_status === 'PICKED_UP' || order.current_status === 'IN_TRANSIT' || order.current_status === 'OUT_FOR_DELIVERY')) {
        const pickupAddr = Array.from(db.order_addresses.values()).find(
          (a) => a.order_id === order.id && a.address_type === 'PICKUP'
        );
        if (pickupAddr) {
          const newDist = calculateHaversineDistance(
            agent.current_latitude,
            agent.current_longitude,
            pickupAddr.latitude,
            pickupAddr.longitude
          );
          asgn.agent_to_pickup_distance_km = newDist;
          asgn.agent_to_pickup_eta_min = estimateUrbanEtaMinutes(newDist);
        }
      }
    }
  }

  broadcastEvent({
    type: 'AGENT_LOCATION_UPDATED',
    payload: {
      agent_id: agent.user_id,
      latitude: agent.current_latitude,
      longitude: agent.current_longitude,
      zone_id: agent.current_zone_id,
      timestamp: now,
    },
  });

  res.json(agent);
});

// Update Agent Availability
apiRouter.post('/agents/:id/availability', (req, res) => {
  const { availability_status } = req.body;
  const agent = db.delivery_agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Delivery agent not found' });

  agent.availability_status = availability_status;
  agent.updated_at = new Date().toISOString();

  broadcastEvent({
    type: 'AGENT_AVAILABILITY_CHANGED',
    payload: { agent_id: agent.user_id, status: availability_status },
  });

  res.json(agent);
});

// ==========================================
// 7. NOTIFICATIONS & DOCUMENTATION
// ==========================================

apiRouter.get('/notifications', (req, res) => {
  const list = Array.from(db.notifications.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json(list);
});

apiRouter.get('/system/overview', (req, res) => {
  res.json({
    total_orders: db.orders.size,
    total_agents: db.delivery_agents.size,
    total_zones: db.zones.size,
    total_rate_cards: db.rate_cards.size,
    total_notifications: db.notifications.size,
    order_statuses: Array.from(db.order_statuses.values()),
  });
});
