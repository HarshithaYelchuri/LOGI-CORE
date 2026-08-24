import {
  User,
  Customer,
  DeliveryAgent,
  Zone,
  ZoneArea,
  AgentLocation,
  Order,
  OrderAddress,
  RateCard,
  ZoneRate,
  CodSurcharge,
  OrderAssignment,
  OrderStatusMaster,
  OrderStatusHistory,
  DeliveryAttempt,
  Reschedule,
  Notification,
  OrderStatusCode,
} from '../src/types';

// In-Memory Master Database Instance with Persistence Structure
export class Database {
  users: Map<string, User> = new Map();
  customers: Map<string, Customer> = new Map();
  delivery_agents: Map<string, DeliveryAgent> = new Map();
  zones: Map<string, Zone> = new Map();
  zone_areas: Map<string, ZoneArea> = new Map();
  agent_locations: Map<string, AgentLocation> = new Map();
  orders: Map<string, Order> = new Map();
  order_addresses: Map<string, OrderAddress> = new Map();
  rate_cards: Map<string, RateCard> = new Map();
  zone_rates: Map<string, ZoneRate> = new Map();
  cod_surcharges: Map<string, CodSurcharge> = new Map();
  order_assignments: Map<string, OrderAssignment> = new Map();
  order_statuses: Map<string, OrderStatusMaster> = new Map();
  order_status_history: Map<string, OrderStatusHistory> = new Map();
  delivery_attempts: Map<string, DeliveryAttempt> = new Map();
  reschedules: Map<string, Reschedule> = new Map();
  notifications: Map<string, Notification> = new Map();

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Order Statuses Master
    const statuses: OrderStatusMaster[] = [
      { id: 'st-1', code: 'CREATED', display_name: 'Created', description: 'Order draft created and details provided', sequence_no: 1, is_terminal: false, is_active: true },
      { id: 'st-2', code: 'CONFIRMED', display_name: 'Confirmed', description: 'Order confirmed and ready for dispatch assignment', sequence_no: 2, is_terminal: false, is_active: true },
      { id: 'st-3', code: 'ASSIGNED', display_name: 'Assigned', description: 'Delivery agent allocated to pickup', sequence_no: 3, is_terminal: false, is_active: true },
      { id: 'st-4', code: 'PICKED_UP', display_name: 'Picked Up', description: 'Consignment collected from sender', sequence_no: 4, is_terminal: false, is_active: true },
      { id: 'st-5', code: 'IN_TRANSIT', display_name: 'In Transit', description: 'Package moving towards distribution hub / delivery zone', sequence_no: 5, is_terminal: false, is_active: true },
      { id: 'st-6', code: 'OUT_FOR_DELIVERY', display_name: 'Out For Delivery', description: 'Rider is on final delivery run to recipient', sequence_no: 6, is_terminal: false, is_active: true },
      { id: 'st-7', code: 'DELIVERED', display_name: 'Delivered', description: 'Package successfully handed over to recipient', sequence_no: 7, is_terminal: true, is_active: true },
      { id: 'st-8', code: 'FAILED', display_name: 'Delivery Failed', description: 'Delivery attempt failed (e.g. recipient absent/address issue)', sequence_no: 8, is_terminal: false, is_active: true },
      { id: 'st-9', code: 'RESCHEDULED', display_name: 'Rescheduled', description: 'Delivery rescheduled for a future slot/agent reassignment', sequence_no: 9, is_terminal: false, is_active: true },
      { id: 'st-10', code: 'CANCELLED', display_name: 'Cancelled', description: 'Order cancelled by customer or dispatcher', sequence_no: 10, is_terminal: true, is_active: true },
    ];
    statuses.forEach(s => this.order_statuses.set(s.id, s));

    // 2. Zones
    const zonesData: Zone[] = [
      { id: 'zone-north', zone_code: 'ZN-01', zone_name: 'Zone North (Kukatpally & Miyapur)', description: 'Northern IT corridor & residential hub', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
      { id: 'zone-west', zone_code: 'ZW-02', zone_name: 'Zone West (HITEC City & Gachibowli)', description: 'Financial district, cyber towers & commercial hubs', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
      { id: 'zone-central', zone_code: 'ZC-03', zone_name: 'Zone Central (Banjara & Jubilee Hills)', description: 'Central commercial, retail & high-density hub', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
      { id: 'zone-south', zone_code: 'ZS-04', zone_name: 'Zone South (Old City & Shamshabad)', description: 'Heritage districts & airport logistics perimeter', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
      { id: 'zone-east', zone_code: 'ZE-05', zone_name: 'Zone East (Uppal & Secunderabad)', description: 'Eastern transport terminals and industrial zones', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
    ];
    zonesData.forEach(z => this.zones.set(z.id, z));

    // 3. Zone Areas (Postal codes mapping)
    const areas: ZoneArea[] = [
      // Zone West
      { id: 'za-1', zone_id: 'zone-west', area_name: 'HITEC City Phase 1 & 2', postal_code: '500081', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-2', zone_id: 'zone-west', area_name: 'Gachibowli Financial District', postal_code: '500032', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-3', zone_id: 'zone-west', area_name: 'Kondapur & Botanical Garden', postal_code: '500084', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-4', zone_id: 'zone-west', area_name: 'Madhapur Cyber Towers', postal_code: '500081', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },

      // Zone Central
      { id: 'za-5', zone_id: 'zone-central', area_name: 'Banjara Hills Rd 1-12', postal_code: '500034', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-6', zone_id: 'zone-central', area_name: 'Jubilee Hills Checkpost', postal_code: '500033', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-7', zone_id: 'zone-central', area_name: 'Somajiguda & Panjagutta', postal_code: '500082', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },

      // Zone North
      { id: 'za-8', zone_id: 'zone-north', area_name: 'Kukatpally Housing Board (KPHB)', postal_code: '500072', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-9', zone_id: 'zone-north', area_name: 'Miyapur Metro Corridor', postal_code: '500049', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-10', zone_id: 'zone-north', area_name: 'Nizampet Village & Bachupally', postal_code: '500090', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },

      // Zone South
      { id: 'za-11', zone_id: 'zone-south', area_name: 'Charminar & High Court', postal_code: '500002', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-12', zone_id: 'zone-south', area_name: 'Shamshabad Airport Zone', postal_code: '500409', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },

      // Zone East
      { id: 'za-13', zone_id: 'zone-east', area_name: 'Secunderabad Railway Station Area', postal_code: '500003', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
      { id: 'za-14', zone_id: 'zone-east', area_name: 'Uppal Stadium Road', postal_code: '500039', city: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2026-01-10T08:00:00Z' },
    ];
    areas.forEach(a => this.zone_areas.set(a.id, a));

    // 4. Rate Cards (B2B and B2C)
    const rateCards: RateCard[] = [
      {
        id: 'rc-b2c-std',
        rate_card_name: 'Standard B2C Retail Delivery Rate Card',
        order_type: 'B2C',
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2028-12-31T23:59:59Z',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'rc-b2b-bulk',
        rate_card_name: 'Commercial B2B Enterprise Rate Card',
        order_type: 'B2B',
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2028-12-31T23:59:59Z',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    rateCards.forEach(rc => this.rate_cards.set(rc.id, rc));

    // 5. Zone Rates (Intra-zone & Inter-zone matrix for both B2C and B2B)
    const zoneIds = ['zone-north', 'zone-west', 'zone-central', 'zone-south', 'zone-east'];
    let zrCount = 1;

    // Helper to generate realistic rates
    for (const pZone of zoneIds) {
      for (const dZone of zoneIds) {
        const isIntra = pZone === dZone;

        // B2C: Intra ~ 45 fixed + 12/kg; Inter ~ 75 fixed + 18/kg (or 95 for far zones like south-north)
        const isFar = (pZone === 'zone-north' && dZone === 'zone-south') || (pZone === 'zone-south' && dZone === 'zone-north');
        const b2cFixed = isIntra ? 45 : (isFar ? 90 : 70);
        const b2cPerKg = isIntra ? 12 : (isFar ? 22 : 18);

        this.zone_rates.set(`zr-${zrCount}`, {
          id: `zr-${zrCount}`,
          rate_card_id: 'rc-b2c-std',
          pickup_zone_id: pZone,
          drop_zone_id: dZone,
          weight_min: 0,
          weight_max: 50,
          fixed_charge: b2cFixed,
          rate_per_order: b2cPerKg,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        });
        zrCount++;

        // B2B: High-volume commercial discount (e.g. 35 fixed + 8/kg intra, 60 fixed + 14/kg inter)
        const b2bFixed = isIntra ? 35 : (isFar ? 75 : 55);
        const b2bPerKg = isIntra ? 8 : (isFar ? 16 : 13);

        this.zone_rates.set(`zr-${zrCount}`, {
          id: `zr-${zrCount}`,
          rate_card_id: 'rc-b2b-bulk',
          pickup_zone_id: pZone,
          drop_zone_id: dZone,
          weight_min: 0,
          weight_max: 100,
          fixed_charge: b2bFixed,
          rate_per_order: b2bPerKg,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        });
        zrCount++;
      }
    }

    // 6. COD Surcharges (Configurable per rate card / order type)
    const codRules: CodSurcharge[] = [
      {
        id: 'cod-b2c',
        rate_card_id: 'rc-b2c-std',
        order_type: 'B2C',
        surcharge_type: 'FIXED',
        surcharge_value: 30, // Flat Rs 30 COD fee
        minimum_charge: 30,
        maximum_charge: 30,
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2028-12-31T23:59:59Z',
        is_active: true,
      },
      {
        id: 'cod-b2b',
        rate_card_id: 'rc-b2b-bulk',
        order_type: 'B2B',
        surcharge_type: 'PERCENTAGE',
        surcharge_value: 2.5, // 2.5% of order charge
        minimum_charge: 40,
        maximum_charge: 250,
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2028-12-31T23:59:59Z',
        is_active: true,
      },
    ];
    codRules.forEach(c => this.cod_surcharges.set(c.id, c));

    // 7. Users (Admin, Customers, Delivery Agents)
    const initialUsers: User[] = [
      // Admin
      {
        id: 'usr-admin-1',
        role: 'ADMIN',
        name: 'Rajesh Sharma (Chief Dispatcher)',
        email: 'admin@lastmile.logistics',
        phone: '+919876543210',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_login_at: '2026-08-23T20:00:00Z',
      },

      // Customers
      {
        id: 'usr-cust-1',
        role: 'CUSTOMER',
        name: 'Priya Narayanan (TechStore Retail)',
        email: 'priya@techstore.in',
        phone: '+919844011223',
        is_active: true,
        created_at: '2026-02-01T10:00:00Z',
        updated_at: '2026-02-01T10:00:00Z',
        last_login_at: '2026-08-23T18:30:00Z',
      },
      {
        id: 'usr-cust-2',
        role: 'CUSTOMER',
        name: 'Vikram Aditya (B2B Distributor)',
        email: 'vikram@adityadistributors.com',
        phone: '+919811099887',
        is_active: true,
        created_at: '2026-02-05T12:00:00Z',
        updated_at: '2026-02-05T12:00:00Z',
        last_login_at: '2026-08-22T14:15:00Z',
      },
      {
        id: 'usr-cust-3',
        role: 'CUSTOMER',
        name: 'Ananya Deshmukh (Individual Shipper)',
        email: 'ananya.d@gmail.com',
        phone: '+919877665544',
        is_active: true,
        created_at: '2026-03-01T09:00:00Z',
        updated_at: '2026-03-01T09:00:00Z',
      },

      // Delivery Agents (Riders)
      {
        id: 'usr-agent-1',
        role: 'DELIVERY_AGENT',
        name: 'Suresh Kumar (Rider)',
        email: 'suresh.rider@lastmile.in',
        phone: '+919833221100',
        is_active: true,
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T10:00:00Z',
        last_login_at: '2026-08-23T21:00:00Z',
      },
      {
        id: 'usr-agent-2',
        role: 'DELIVERY_AGENT',
        name: 'Mohammed Arshad (Rider)',
        email: 'arshad.rider@lastmile.in',
        phone: '+919833221101',
        is_active: true,
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T10:00:00Z',
        last_login_at: '2026-08-23T21:10:00Z',
      },
      {
        id: 'usr-agent-3',
        role: 'DELIVERY_AGENT',
        name: 'Ravi Teja (Express Rider)',
        email: 'ravi.teja@lastmile.in',
        phone: '+919833221102',
        is_active: true,
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T10:00:00Z',
        last_login_at: '2026-08-23T19:40:00Z',
      },
      {
        id: 'usr-agent-4',
        role: 'DELIVERY_AGENT',
        name: 'Kiran Reddy (Electric Scooter)',
        email: 'kiran.reddy@lastmile.in',
        phone: '+919833221103',
        is_active: true,
        created_at: '2026-02-01T08:00:00Z',
        updated_at: '2026-08-23T10:00:00Z',
        last_login_at: '2026-08-23T18:00:00Z',
      },
    ];
    initialUsers.forEach(u => this.users.set(u.id, u));

    // 8. Customers Table
    const customersData: Customer[] = [
      {
        user_id: 'usr-cust-1',
        default_address: 'Plot 42, Inorbit Mall Road, Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500081',
        created_at: '2026-02-01T10:00:00Z',
      },
      {
        user_id: 'usr-cust-2',
        default_address: 'Wholesale Hub B-12, Kukatpally Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500072',
        created_at: '2026-02-05T12:00:00Z',
      },
      {
        user_id: 'usr-cust-3',
        default_address: 'Flat 304, Emerald Heights, Road No 10, Banjara Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500034',
        created_at: '2026-03-01T09:00:00Z',
      },
    ];
    customersData.forEach(c => this.customers.set(c.user_id, c));

    // 9. Delivery Agents Table
    // Hyderabad Coordinates: HITEC City ~ (17.4435, 78.3772), Gachibowli ~ (17.4401, 78.3489), Banjara Hills ~ (17.4156, 78.4350), Kukatpally ~ (17.4938, 78.3995)
    const agentsData: DeliveryAgent[] = [
      {
        user_id: 'usr-agent-1',
        employee_code: 'AGT-HYD-101',
        vehicle_type: 'Motorcycle (Hero Splendor)',
        availability_status: 'AVAILABLE',
        current_latitude: 17.4485,
        current_longitude: 17.4485 > 70 ? 78.3780 : 78.3780, // 17.4485, 78.3780 (Kondapur / HITEC)
        current_zone_id: 'zone-west',
        last_location_at: '2026-08-23T22:30:00Z',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T22:30:00Z',
      },
      {
        user_id: 'usr-agent-2',
        employee_code: 'AGT-HYD-102',
        vehicle_type: 'Ather 450X Electric Scooter',
        availability_status: 'BUSY',
        current_latitude: 17.4180,
        current_longitude: 78.4380, // Banjara Hills Central
        current_zone_id: 'zone-central',
        last_location_at: '2026-08-23T22:25:00Z',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T22:25:00Z',
      },
      {
        user_id: 'usr-agent-3',
        employee_code: 'AGT-HYD-103',
        vehicle_type: 'Honda Activa 6G',
        availability_status: 'AVAILABLE',
        current_latitude: 17.4950,
        current_longitude: 78.4010, // Kukatpally North
        current_zone_id: 'zone-north',
        last_location_at: '2026-08-23T22:28:00Z',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-08-23T22:28:00Z',
      },
      {
        user_id: 'usr-agent-4',
        employee_code: 'AGT-HYD-104',
        vehicle_type: 'TVS iQube EV',
        availability_status: 'AVAILABLE',
        current_latitude: 17.4350,
        current_longitude: 78.3580, // Gachibowli West
        current_zone_id: 'zone-west',
        last_location_at: '2026-08-23T22:15:00Z',
        created_at: '2026-02-01T08:00:00Z',
        updated_at: '2026-08-23T22:15:00Z',
      },
    ];
    agentsData.forEach(a => this.delivery_agents.set(a.user_id, a));

    // Agent Location logs
    agentsData.forEach((a, idx) => {
      this.agent_locations.set(`loc-${idx + 1}`, {
        id: `loc-${idx + 1}`,
        agent_id: a.user_id,
        latitude: a.current_latitude,
        longitude: a.current_longitude,
        zone_id: a.current_zone_id,
        recorded_at: a.last_location_at,
      });
    });

    // 10. Pre-seed Demonstrative Orders across Lifecycles
    this.createDemoOrders();
  }

  private createDemoOrders() {
    // Order 1: LM-1024 - Active In-Transit / Out for Delivery (Rider Suresh Assigned)
    const o1: Order = {
      id: 'ord-1024',
      order_number: 'LM-1024',
      customer_id: 'usr-cust-1',
      created_by: 'usr-cust-1',
      order_type: 'B2C',
      payment_type: 'PREPAID',
      actual_weight: 1.5,
      length: 25,
      breadth: 20,
      height: 15,
      volumetric_weight: 1.5, // (25*20*15)/5000 = 1.5
      chargeable_weight: 1.5,
      pickup_zone_id: 'zone-west',
      drop_zone_id: 'zone-central',
      pickup_to_drop_distance_km: 7.2,
      pickup_to_drop_eta_min: 22,
      base_charge: 97.0, // 70 fixed + 18 * 1.5 = 97
      cod_surcharge: 0,
      total_charge: 97.0,
      current_status: 'OUT_FOR_DELIVERY',
      confirmed_at: '2026-08-23T19:00:00Z',
      created_at: '2026-08-23T18:45:00Z',
      updated_at: '2026-08-23T21:45:00Z',
    };
    this.orders.set(o1.id, o1);

    const addr1_p: OrderAddress = {
      id: 'addr-1-p',
      order_id: 'ord-1024',
      address_type: 'PICKUP',
      contact_name: 'TechStore Dispatch Hub',
      contact_phone: '+919844011223',
      address_line_1: 'Shop 14, Ground Floor, Cyber Gateway',
      address_line_2: 'Madhapur Main Rd',
      area: 'HITEC City',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500081',
      latitude: 17.4474,
      longitude: 78.3762,
      zone_id: 'zone-west',
      created_at: '2026-08-23T18:45:00Z',
    };
    const addr1_d: OrderAddress = {
      id: 'addr-1-d',
      order_id: 'ord-1024',
      address_type: 'DROP',
      contact_name: 'Dr. Ramesh Varma',
      contact_phone: '+919844998877',
      address_line_1: 'Villa 18, Road No. 36',
      address_line_2: 'Opposite Peddamma Temple',
      area: 'Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500033',
      latitude: 17.4319,
      longitude: 78.4073,
      zone_id: 'zone-central',
      created_at: '2026-08-23T18:45:00Z',
    };
    this.order_addresses.set(addr1_p.id, addr1_p);
    this.order_addresses.set(addr1_d.id, addr1_d);

    // Assignment for LM-1024
    const asgn1: OrderAssignment = {
      id: 'asgn-1024',
      order_id: 'ord-1024',
      agent_id: 'usr-agent-1',
      assignment_type: 'AUTO',
      assigned_by: 'usr-admin-1',
      assigned_at: '2026-08-23T19:05:00Z',
      is_current: true,
      assignment_reason: 'Nearest available rider (1.8 km from pickup in Zone West)',
      agent_to_pickup_distance_km: 1.8,
      agent_to_pickup_eta_min: 6,
    };
    this.order_assignments.set(asgn1.id, asgn1);

    // History for LM-1024
    const hist1: OrderStatusHistory[] = [
      { id: 'h-1', order_id: 'ord-1024', old_status: null, new_status: 'CREATED', changed_by: 'usr-cust-1', changed_at: '2026-08-23T18:45:00Z', remarks: 'Customer submitted package details and got quote' },
      { id: 'h-2', order_id: 'ord-1024', old_status: 'CREATED', new_status: 'CONFIRMED', changed_by: 'usr-cust-1', changed_at: '2026-08-23T19:00:00Z', remarks: 'Order confirmed with online prepaid payment' },
      { id: 'h-3', order_id: 'ord-1024', old_status: 'CONFIRMED', new_status: 'ASSIGNED', changed_by: 'usr-admin-1', changed_at: '2026-08-23T19:05:00Z', remarks: 'Auto-assigned to nearest agent Suresh Kumar' },
      { id: 'h-4', order_id: 'ord-1024', old_status: 'ASSIGNED', new_status: 'PICKED_UP', changed_by: 'usr-agent-1', changed_at: '2026-08-23T19:35:00Z', remarks: 'Package scanned and verified at pickup' },
      { id: 'h-5', order_id: 'ord-1024', old_status: 'PICKED_UP', new_status: 'IN_TRANSIT', changed_by: 'usr-agent-1', changed_at: '2026-08-23T20:10:00Z', remarks: 'Crossing Durgam Cheruvu bridge towards Jubilee Hills' },
      { id: 'h-6', order_id: 'ord-1024', old_status: 'IN_TRANSIT', new_status: 'OUT_FOR_DELIVERY', changed_by: 'usr-agent-1', changed_at: '2026-08-23T21:45:00Z', remarks: 'Rider is 1.2 km away from destination villa' },
    ];
    hist1.forEach(h => this.order_status_history.set(h.id, h));

    // Order 2: LM-1025 - Failed Delivery Attempt ready for Reschedule Flow!
    const o2: Order = {
      id: 'ord-1025',
      order_number: 'LM-1025',
      customer_id: 'usr-cust-2',
      created_by: 'usr-cust-2',
      order_type: 'B2B',
      payment_type: 'COD',
      actual_weight: 8.0,
      length: 40,
      breadth: 30,
      height: 25,
      volumetric_weight: 6.0, // (40*30*25)/5000 = 6.0kg. Chargeable = 8.0 kg (actual > volumetric)
      chargeable_weight: 8.0,
      pickup_zone_id: 'zone-north',
      drop_zone_id: 'zone-west',
      pickup_to_drop_distance_km: 11.4,
      pickup_to_drop_eta_min: 34,
      base_charge: 159.0, // 55 fixed + 13 * 8 = 159
      cod_surcharge: 40.0, // 2.5% of 159 = 3.97 -> clamped to min Rs 40
      total_charge: 199.0,
      current_status: 'FAILED',
      confirmed_at: '2026-08-23T14:00:00Z',
      created_at: '2026-08-23T13:50:00Z',
      updated_at: '2026-08-23T17:30:00Z',
    };
    this.orders.set(o2.id, o2);

    const addr2_p: OrderAddress = {
      id: 'addr-2-p',
      order_id: 'ord-1025',
      address_type: 'PICKUP',
      contact_name: 'Aditya Warehouse B-12',
      contact_phone: '+919811099887',
      address_line_1: 'Plot 88, KPHB Phase 3',
      area: 'Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500072',
      latitude: 17.4938,
      longitude: 78.3995,
      zone_id: 'zone-north',
      created_at: '2026-08-23T13:50:00Z',
    };
    const addr2_d: OrderAddress = {
      id: 'addr-2-d',
      order_id: 'ord-1025',
      address_type: 'DROP',
      contact_name: 'NexGen Infotech Procurement',
      contact_phone: '+919811223344',
      address_line_1: 'Tower 4, Floor 6, Mindspace SEZ',
      area: 'HITEC City',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500081',
      latitude: 17.4435,
      longitude: 78.3772,
      zone_id: 'zone-west',
      created_at: '2026-08-23T13:50:00Z',
    };
    this.order_addresses.set(addr2_p.id, addr2_p);
    this.order_addresses.set(addr2_d.id, addr2_d);

    // Delivery Attempt 1 recorded as failed
    const att1: DeliveryAttempt = {
      id: 'att-1025-1',
      order_id: 'ord-1025',
      attempt_number: 1,
      agent_id: 'usr-agent-2',
      scheduled_date: '2026-08-23',
      started_at: '2026-08-23T16:00:00Z',
      completed_at: '2026-08-23T17:30:00Z',
      outcome: 'FAILED',
      failure_reason: 'Customer Office Closed / Contact Person Unavailable',
      remarks: 'Recipient office was shut by 5:30 PM. Contact phone unreachable after 3 rings.',
      created_at: '2026-08-23T17:30:00Z',
    };
    this.delivery_attempts.set(att1.id, att1);

    const hist2: OrderStatusHistory[] = [
      { id: 'h-10', order_id: 'ord-1025', old_status: null, new_status: 'CREATED', changed_by: 'usr-cust-2', changed_at: '2026-08-23T13:50:00Z', remarks: 'B2B order generated' },
      { id: 'h-11', order_id: 'ord-1025', old_status: 'CREATED', new_status: 'CONFIRMED', changed_by: 'usr-cust-2', changed_at: '2026-08-23T14:00:00Z', remarks: 'Order confirmed with COD payment' },
      { id: 'h-12', order_id: 'ord-1025', old_status: 'CONFIRMED', new_status: 'ASSIGNED', changed_by: 'usr-admin-1', changed_at: '2026-08-23T14:15:00Z', remarks: 'Assigned to Mohammed Arshad' },
      { id: 'h-13', order_id: 'ord-1025', old_status: 'ASSIGNED', new_status: 'PICKED_UP', changed_by: 'usr-agent-2', changed_at: '2026-08-23T15:20:00Z', remarks: 'Collected 8kg industrial spares package' },
      { id: 'h-14', order_id: 'ord-1025', old_status: 'PICKED_UP', new_status: 'OUT_FOR_DELIVERY', changed_by: 'usr-agent-2', changed_at: '2026-08-23T16:40:00Z', remarks: 'Rider arrived at Mindspace SEZ gate' },
      { id: 'h-15', order_id: 'ord-1025', old_status: 'OUT_FOR_DELIVERY', new_status: 'FAILED', changed_by: 'usr-agent-2', changed_at: '2026-08-23T17:30:00Z', remarks: 'Attempt 1 Failed: Office closed. Customer notified to reschedule.' },
    ];
    hist2.forEach(h => this.order_status_history.set(h.id, h));

    // Order 3: LM-1026 - Fresh Confirmed Order waiting for Agent Assignment
    const o3: Order = {
      id: 'ord-1026',
      order_number: 'LM-1026',
      customer_id: 'usr-cust-3',
      created_by: 'usr-cust-3',
      order_type: 'B2C',
      payment_type: 'PREPAID',
      actual_weight: 0.8,
      length: 15,
      breadth: 15,
      height: 10,
      volumetric_weight: 0.45,
      chargeable_weight: 0.8,
      pickup_zone_id: 'zone-central',
      drop_zone_id: 'zone-central',
      pickup_to_drop_distance_km: 3.4,
      pickup_to_drop_eta_min: 12,
      base_charge: 54.6, // 45 + 12 * 0.8 = 54.6
      cod_surcharge: 0,
      total_charge: 54.6,
      current_status: 'CONFIRMED',
      confirmed_at: '2026-08-23T22:00:00Z',
      created_at: '2026-08-23T21:55:00Z',
      updated_at: '2026-08-23T22:00:00Z',
    };
    this.orders.set(o3.id, o3);

    const addr3_p: OrderAddress = {
      id: 'addr-3-p',
      order_id: 'ord-1026',
      address_type: 'PICKUP',
      contact_name: 'Ananya Deshmukh',
      contact_phone: '+919877665544',
      address_line_1: 'Flat 304, Emerald Heights',
      address_line_2: 'Road No 10',
      area: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500034',
      latitude: 17.4156,
      longitude: 78.4350,
      zone_id: 'zone-central',
      created_at: '2026-08-23T21:55:00Z',
    };
    const addr3_d: OrderAddress = {
      id: 'addr-3-d',
      order_id: 'ord-1026',
      address_type: 'DROP',
      contact_name: 'Kavita Rao',
      contact_phone: '+919877001122',
      address_line_1: 'House 8-2-293, Somajiguda Officers Colony',
      area: 'Somajiguda',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500082',
      latitude: 17.4245,
      longitude: 78.4520,
      zone_id: 'zone-central',
      created_at: '2026-08-23T21:55:00Z',
    };
    this.order_addresses.set(addr3_p.id, addr3_p);
    this.order_addresses.set(addr3_d.id, addr3_d);

    const hist3: OrderStatusHistory[] = [
      { id: 'h-20', order_id: 'ord-1026', old_status: null, new_status: 'CREATED', changed_by: 'usr-cust-3', changed_at: '2026-08-23T21:55:00Z', remarks: 'Intra-zone parcel order booked' },
      { id: 'h-21', order_id: 'ord-1026', old_status: 'CREATED', new_status: 'CONFIRMED', changed_by: 'usr-cust-3', changed_at: '2026-08-23T22:00:00Z', remarks: 'Payment processed. Ready for dispatch agent allocation.' },
    ];
    hist3.forEach(h => this.order_status_history.set(h.id, h));

    // Notifications seed
    this.notifications.set('notif-1', {
      id: 'notif-1',
      order_id: 'ord-1024',
      user_id: 'usr-cust-1',
      notification_type: 'SMS',
      event_type: 'OUT_FOR_DELIVERY',
      recipient: '+919844011223',
      subject: 'Order LM-1024 is Out for Delivery',
      message: 'Your package #LM-1024 is out for delivery with rider Suresh Kumar (+919833221100). ETA is ~22 mins.',
      status: 'SENT',
      sent_at: '2026-08-23T21:45:05Z',
      created_at: '2026-08-23T21:45:00Z',
    });

    this.notifications.set('notif-2', {
      id: 'notif-2',
      order_id: 'ord-1025',
      user_id: 'usr-cust-2',
      notification_type: 'EMAIL',
      event_type: 'FAILED_DELIVERY',
      recipient: 'vikram@adityadistributors.com',
      subject: 'Action Required: Delivery Attempt Failed for Order #LM-1025',
      message: 'We attempted delivery of order #LM-1025 today at 17:30, but the recipient office was unavailable. Please log in to reschedule your delivery date.',
      status: 'SENT',
      sent_at: '2026-08-23T17:30:05Z',
      created_at: '2026-08-23T17:30:00Z',
    });
  }

  // --- QUERY & MUTATION METHODS ---

  getPopulatedOrder(orderId: string): Order | null {
    const o = this.orders.get(orderId);
    if (!o) return null;

    const customer = this.customers.get(o.customer_id);
    const creator = this.users.get(o.created_by);
    const pickup_zone = this.zones.get(o.pickup_zone_id);
    const drop_zone = this.zones.get(o.drop_zone_id);

    let pickup_address: OrderAddress | undefined;
    let drop_address: OrderAddress | undefined;
    for (const addr of this.order_addresses.values()) {
      if (addr.order_id === orderId) {
        if (addr.address_type === 'PICKUP') pickup_address = addr;
        if (addr.address_type === 'DROP') drop_address = addr;
      }
    }

    let current_assignment: OrderAssignment | undefined;
    for (const asgn of this.order_assignments.values()) {
      if (asgn.order_id === orderId && asgn.is_current) {
        const agent = this.delivery_agents.get(asgn.agent_id);
        const assigner = this.users.get(asgn.assigned_by);
        const agentUser = agent ? this.users.get(agent.user_id) : undefined;
        current_assignment = {
          ...asgn,
          agent: agent ? { ...agent, user: agentUser } : undefined,
          assigner,
        };
        break;
      }
    }

    const history: OrderStatusHistory[] = [];
    for (const h of this.order_status_history.values()) {
      if (h.order_id === orderId) {
        const actor = this.users.get(h.changed_by);
        history.push({ ...h, actor });
      }
    }
    history.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

    const attempts: DeliveryAttempt[] = [];
    for (const att of this.delivery_attempts.values()) {
      if (att.order_id === orderId) {
        const agent = this.delivery_agents.get(att.agent_id);
        const agentUser = agent ? this.users.get(agent.user_id) : undefined;
        attempts.push({
          ...att,
          agent: agent ? { ...agent, user: agentUser } : undefined,
        });
      }
    }
    attempts.sort((a, b) => a.attempt_number - b.attempt_number);

    const reschedules: Reschedule[] = [];
    for (const res of this.reschedules.values()) {
      if (res.order_id === orderId) {
        const requester = this.users.get(res.requested_by);
        reschedules.push({ ...res, requester });
      }
    }

    const notifications: Notification[] = [];
    for (const notif of this.notifications.values()) {
      if (notif.order_id === orderId) {
        notifications.push(notif);
      }
    }
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      ...o,
      customer: customer ? { ...customer, user: this.users.get(customer.user_id) } : undefined,
      creator,
      pickup_address,
      drop_address,
      pickup_zone,
      drop_zone,
      current_assignment,
      history,
      attempts,
      reschedules,
      notifications,
    };
  }

  getAllPopulatedOrders(): Order[] {
    const results: Order[] = [];
    for (const id of this.orders.keys()) {
      const pop = this.getPopulatedOrder(id);
      if (pop) results.push(pop);
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getPopulatedAgents(): DeliveryAgent[] {
    const agents: DeliveryAgent[] = [];
    for (const da of this.delivery_agents.values()) {
      const user = this.users.get(da.user_id);
      const zone = this.zones.get(da.current_zone_id);
      agents.push({
        ...da,
        user,
        zone,
      });
    }
    return agents;
  }
}

export const db = new Database();
