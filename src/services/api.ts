import {
  User,
  Customer,
  DeliveryAgent,
  Zone,
  ZoneArea,
  Order,
  RateCard,
  ZoneRate,
  CodSurcharge,
  RateCalculationInput,
  RateCalculationResult,
  Notification,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    return res.json();
  },

  async login(payload: { email?: string; role?: string; user_id?: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async register(payload: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Zones & Areas
  async getZones(): Promise<Zone[]> {
    const res = await fetch(`${API_BASE}/zones`);
    return res.json();
  },

  async createZone(data: Partial<Zone>): Promise<Zone> {
    const res = await fetch(`${API_BASE}/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getZoneAreas(): Promise<ZoneArea[]> {
    const res = await fetch(`${API_BASE}/zone-areas`);
    return res.json();
  },

  async createZoneArea(data: Partial<ZoneArea>): Promise<ZoneArea> {
    const res = await fetch(`${API_BASE}/zone-areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteZoneArea(id: string) {
    const res = await fetch(`${API_BASE}/zone-areas/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async detectZone(payload: { postal_code?: string; area_name?: string; zone_id?: string }) {
    const res = await fetch(`${API_BASE}/zones/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Pricing & Rates
  async getRateCards(): Promise<RateCard[]> {
    const res = await fetch(`${API_BASE}/rate-cards`);
    return res.json();
  },

  async getZoneRates(): Promise<ZoneRate[]> {
    const res = await fetch(`${API_BASE}/zone-rates`);
    return res.json();
  },

  async saveZoneRate(data: Partial<ZoneRate>): Promise<ZoneRate> {
    const res = await fetch(`${API_BASE}/zone-rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getCodSurcharges(): Promise<CodSurcharge[]> {
    const res = await fetch(`${API_BASE}/cod-surcharges`);
    return res.json();
  },

  async saveCodSurcharge(data: Partial<CodSurcharge>): Promise<CodSurcharge> {
    const res = await fetch(`${API_BASE}/cod-surcharges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async calculatePricing(input: RateCalculationInput): Promise<RateCalculationResult> {
    const res = await fetch(`${API_BASE}/pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to calculate rate');
    }
    return res.json();
  },

  // Orders
  async getOrders(params?: Record<string, string>): Promise<Order[]> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/orders${query}`);
    return res.json();
  },

  async getOrder(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    return res.json();
  },

  async createOrder(payload: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrderStatus(id: string, payload: { status: string; changed_by: string; remarks?: string }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async overrideOrderStatus(id: string, payload: { new_status: string; changed_by: string; reason: string }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/override-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to override status');
    }
    return res.json();
  },

  async reportFailedDelivery(id: string, payload: { agent_id: string; failure_reason: string; remarks?: string }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/fail-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async rescheduleOrder(id: string, payload: { requested_date: string; reason?: string; requested_by: string; auto_reassign?: boolean }): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Assignments
  async getAgentCandidates(orderId: string) {
    const res = await fetch(`${API_BASE}/assignments/candidates/${orderId}`);
    return res.json();
  },

  async assignAgent(payload: { order_id: string; agent_id: string; assigned_by: string; reason?: string }) {
    const res = await fetch(`${API_BASE}/assignments/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async autoAssignOrder(orderId: string, assignedBy: string) {
    const res = await fetch(`${API_BASE}/assignments/auto-assign/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_by: assignedBy }),
    });
    return res.json();
  },

  // Agents
  async getAgents(): Promise<DeliveryAgent[]> {
    const res = await fetch(`${API_BASE}/agents`);
    return res.json();
  },

  async updateAgentLocation(agentId: string, payload: { latitude: number; longitude: number; zone_id?: string }) {
    const res = await fetch(`${API_BASE}/agents/${agentId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateAgentAvailability(agentId: string, status: string) {
    const res = await fetch(`${API_BASE}/agents/${agentId}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability_status: status }),
    });
    return res.json();
  },

  // Notifications & Stats
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications`);
    return res.json();
  },

  async getSystemOverview() {
    const res = await fetch(`${API_BASE}/system/overview`);
    return res.json();
  },
};
