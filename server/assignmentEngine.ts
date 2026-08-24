import { db } from './db';
import { calculateHaversineDistance, estimateUrbanEtaMinutes, getCoordinatesForZoneOrPostal } from './rateEngine';
import { DeliveryAgent, Order, OrderAssignment } from '../src/types';
import { createNotificationForEvent } from './notificationEngine';
import { broadcastEvent } from './wsServer';

export interface AgentCandidate {
  agent: DeliveryAgent;
  distance_km: number;
  eta_min: number;
  is_in_same_zone: boolean;
  score: number; // Lower score = better candidate
}

export function findEligibleAgentsForOrder(orderId: string): AgentCandidate[] {
  const order = db.getPopulatedOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const pickupAddr = order.pickup_address;
  const pickupLat = pickupAddr?.latitude || getCoordinatesForZoneOrPostal(order.pickup_zone_id).lat;
  const pickupLng = pickupAddr?.longitude || getCoordinatesForZoneOrPostal(order.pickup_zone_id).lng;

  const candidates: AgentCandidate[] = [];

  for (const da of db.delivery_agents.values()) {
    const user = db.users.get(da.user_id);
    if (!user || !user.is_active) continue;

    // Filter for agents who are AVAILABLE (or evaluate BUSY with penalty)
    const isAvailable = da.availability_status === 'AVAILABLE';
    const isBusy = da.availability_status === 'BUSY';
    if (!isAvailable && !isBusy) continue; // Skip OFFLINE or SUSPENDED

    const dist = calculateHaversineDistance(
      da.current_latitude,
      da.current_longitude,
      pickupLat,
      pickupLng
    );
    const eta = estimateUrbanEtaMinutes(dist);
    const sameZone = da.current_zone_id === order.pickup_zone_id;

    // Score heuristic: Distance + Same Zone bonus (-2km equivalent) + Availability penalty (+10km if busy)
    let score = dist;
    if (sameZone) score -= 1.5;
    if (!isAvailable) score += 8.0;

    candidates.push({
      agent: {
        ...da,
        user,
        zone: db.zones.get(da.current_zone_id),
      },
      distance_km: dist,
      eta_min: eta,
      is_in_same_zone: sameZone,
      score: Math.max(0.1, Math.round(score * 10) / 10),
    });
  }

  // Sort by lowest score (nearest available first)
  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

export function assignAgentToOrder(params: {
  order_id: string;
  agent_id: string;
  assignment_type: 'MANUAL' | 'AUTO';
  assigned_by: string;
  reason?: string;
}): OrderAssignment {
  const order = db.getPopulatedOrder(params.order_id);
  if (!order) throw new Error('Order not found');

  const agent = db.delivery_agents.get(params.agent_id);
  if (!agent) throw new Error('Delivery agent not found');

  const agentUser = db.users.get(agent.user_id);

  // Compute dynamic distance & ETA from agent's current location to pickup address
  const pickupAddr = order.pickup_address;
  const pickupLat = pickupAddr?.latitude || getCoordinatesForZoneOrPostal(order.pickup_zone_id).lat;
  const pickupLng = pickupAddr?.longitude || getCoordinatesForZoneOrPostal(order.pickup_zone_id).lng;

  const distance_km = calculateHaversineDistance(
    agent.current_latitude,
    agent.current_longitude,
    pickupLat,
    pickupLng
  );
  const eta_min = estimateUrbanEtaMinutes(distance_km);

  const now = new Date().toISOString();

  // 1. Mark any previous assignment as unassigned
  for (const asgn of db.order_assignments.values()) {
    if (asgn.order_id === params.order_id && asgn.is_current) {
      asgn.is_current = false;
      asgn.unassigned_at = now;
    }
  }

  // 2. Create new assignment record
  const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const assignment: OrderAssignment = {
    id: assignmentId,
    order_id: params.order_id,
    agent_id: params.agent_id,
    assignment_type: params.assignment_type,
    assigned_by: params.assigned_by,
    assigned_at: now,
    is_current: true,
    assignment_reason: params.reason || (params.assignment_type === 'AUTO'
      ? `Auto-assigned: nearest available rider (${distance_km} km away, ~${eta_min}m ETA)`
      : `Manual allocation by dispatcher`),
    agent_to_pickup_distance_km: distance_km,
    agent_to_pickup_eta_min: eta_min,
  };
  db.order_assignments.set(assignment.id, assignment);

  // 3. Update agent availability to BUSY
  agent.availability_status = 'BUSY';
  agent.updated_at = now;

  // 4. Update order status to ASSIGNED if previously CREATED / CONFIRMED / RESCHEDULED / FAILED
  const oldStatus = order.current_status;
  const rawOrder = db.orders.get(params.order_id)!;
  rawOrder.current_status = 'ASSIGNED';
  rawOrder.updated_at = now;

  // 5. Immutable status history entry
  const historyId = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.order_status_history.set(historyId, {
    id: historyId,
    order_id: params.order_id,
    old_status: oldStatus,
    new_status: 'ASSIGNED',
    changed_by: params.assigned_by,
    changed_at: now,
    remarks: `Assigned to rider ${agentUser?.name || agent.employee_code} (${params.assignment_type === 'AUTO' ? 'Auto-routed' : 'Manual Dispatch'}) - ${distance_km} km to pickup`,
  });

  // 6. Generate notifications
  createNotificationForEvent({
    order_id: params.order_id,
    user_id: order.customer_id,
    event_type: 'ORDER_ASSIGNED',
    notification_type: 'SMS',
    subject: `Rider Assigned to Order #${rawOrder.order_number}`,
    message: `Rider ${agentUser?.name || 'Assigned Agent'} (${agent.vehicle_type}) has been assigned to your order #${rawOrder.order_number}. Estimated arrival at pickup is ~${eta_min} minutes.`,
  });

  // 7. Broadcast WebSocket event
  broadcastEvent({
    type: 'AGENT_ASSIGNED',
    payload: {
      order_id: params.order_id,
      order_number: rawOrder.order_number,
      agent_id: params.agent_id,
      agent_name: agentUser?.name,
      distance_km,
      eta_min,
      status: 'ASSIGNED',
    },
  });

  return assignment;
}

export function autoAssignOrder(orderId: string, assignedBy: string): OrderAssignment {
  const candidates = findEligibleAgentsForOrder(orderId);
  if (candidates.length === 0) {
    throw new Error('No available delivery agents found in active fleet.');
  }

  const best = candidates[0];
  return assignAgentToOrder({
    order_id: orderId,
    agent_id: best.agent.user_id,
    assignment_type: 'AUTO',
    assigned_by: assignedBy,
    reason: `Auto-selected nearest agent (${best.distance_km} km from pickup in ${best.agent.zone?.zone_name || 'Zone'}, ETA ~${best.eta_min}m)`,
  });
}
