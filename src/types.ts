export type UserRole = 'CUSTOMER' | 'DELIVERY_AGENT' | 'ADMIN';
export type OrderType = 'B2B' | 'B2C';
export type PaymentType = 'PREPAID' | 'COD';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'SUSPENDED';
export type AddressType = 'PICKUP' | 'DROP';
export type SurchargeType = 'FIXED' | 'PERCENTAGE';
export type AssignmentType = 'MANUAL' | 'AUTO';
export type NotificationType = 'EMAIL' | 'SMS';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export type OrderStatusCode =
  | 'CREATED'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED'
  | 'CANCELLED';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  password_hash?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Customer {
  user_id: string;
  default_address: string;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
  user?: User;
}

export interface DeliveryAgent {
  user_id: string;
  employee_code: string;
  vehicle_type: string;
  availability_status: AvailabilityStatus;
  current_latitude: number;
  current_longitude: number;
  current_zone_id: string;
  last_location_at: string;
  created_at: string;
  updated_at: string;
  user?: User;
  zone?: Zone;
}

export interface Zone {
  id: string;
  zone_code: string;
  zone_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  areas_count?: number;
}

export interface ZoneArea {
  id: string;
  zone_id: string;
  area_name: string;
  postal_code: string;
  city: string;
  state: string;
  is_active: boolean;
  created_at: string;
}

export interface AgentLocation {
  id: string;
  agent_id: string;
  latitude: number;
  longitude: number;
  zone_id: string;
  recorded_at: string;
}

export interface OrderAddress {
  id: string;
  order_id: string;
  address_type: AddressType;
  contact_name: string;
  contact_phone: string;
  address_line_1: string;
  address_line_2?: string;
  area: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  zone_id: string;
  zone_name?: string;
  created_at: string;
}

export interface RateCard {
  id: string;
  rate_card_name: string;
  order_type: OrderType;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoneRate {
  id: string;
  rate_card_id: string;
  pickup_zone_id: string;
  drop_zone_id: string;
  weight_min: number;
  weight_max: number;
  rate_per_order: number;
  fixed_charge: number;
  created_at: string;
  updated_at: string;
  pickup_zone?: Zone;
  drop_zone?: Zone;
}

export interface CodSurcharge {
  id: string;
  rate_card_id: string;
  order_type: OrderType;
  surcharge_type: SurchargeType;
  surcharge_value: number;
  minimum_charge: number;
  maximum_charge: number;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  agent_id: string;
  assignment_type: AssignmentType;
  assigned_by: string;
  assigned_at: string;
  unassigned_at?: string;
  is_current: boolean;
  assignment_reason?: string;
  agent_to_pickup_distance_km: number;
  agent_to_pickup_eta_min: number;
  agent?: DeliveryAgent;
  assigner?: User;
}

export interface OrderStatusMaster {
  id: string;
  code: OrderStatusCode;
  display_name: string;
  description: string;
  sequence_no: number;
  is_terminal: boolean;
  is_active: boolean;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OrderStatusCode | null;
  new_status: OrderStatusCode;
  changed_by: string;
  changed_at: string;
  remarks: string;
  actor?: User;
}

export interface DeliveryAttempt {
  id: string;
  order_id: string;
  attempt_number: number;
  agent_id: string;
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  outcome: 'SUCCESS' | 'FAILED';
  failure_reason?: string;
  remarks?: string;
  created_at: string;
  agent?: DeliveryAgent;
}

export interface Reschedule {
  id: string;
  order_id: string;
  delivery_attempt_id: string;
  requested_by: string;
  requested_date: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'COMPLETED';
  created_at: string;
  requester?: User;
}

export interface Notification {
  id: string;
  order_id: string;
  user_id: string;
  notification_type: NotificationType;
  event_type: string;
  recipient: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  sent_at?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  created_by: string;
  order_type: OrderType;
  payment_type: PaymentType;
  actual_weight: number;
  length: number;
  breadth: number;
  height: number;
  volumetric_weight: number;
  chargeable_weight: number;
  pickup_zone_id: string;
  drop_zone_id: string;
  pickup_to_drop_distance_km: number;
  pickup_to_drop_eta_min: number;
  base_charge: number;
  cod_surcharge: number;
  total_charge: number;
  current_status: OrderStatusCode;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  customer?: Customer;
  creator?: User;
  pickup_address?: OrderAddress;
  drop_address?: OrderAddress;
  pickup_zone?: Zone;
  drop_zone?: Zone;
  current_assignment?: OrderAssignment;
  history?: OrderStatusHistory[];
  attempts?: DeliveryAttempt[];
  reschedules?: Reschedule[];
  notifications?: Notification[];
}

export interface RateCalculationInput {
  pickup_postal_code?: string;
  pickup_area?: string;
  pickup_zone_id?: string;
  drop_postal_code?: string;
  drop_area?: string;
  drop_zone_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  length: number;
  breadth: number;
  height: number;
  actual_weight: number;
  order_type: OrderType;
  payment_type: PaymentType;
}

export interface RateCalculationResult {
  pickup_zone: Zone;
  drop_zone: Zone;
  volumetric_weight: number;
  chargeable_weight: number;
  is_volumetric: boolean;
  rate_card: RateCard;
  zone_rate: ZoneRate;
  base_charge: number;
  cod_surcharge_rule?: CodSurcharge;
  cod_surcharge: number;
  total_charge: number;
  pickup_to_drop_distance_km: number;
  pickup_to_drop_eta_min: number;
  breakdown: {
    formula: string;
    volumetric_calc: string;
    chargeable_rule: string;
    zone_pair: string;
    rate_card_applied: string;
    rate_details: string;
    cod_calc: string;
  };
}
