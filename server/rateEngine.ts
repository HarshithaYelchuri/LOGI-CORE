import { db } from './db';
import {
  RateCalculationInput,
  RateCalculationResult,
  Zone,
  ZoneArea,
  RateCard,
  ZoneRate,
  CodSurcharge,
} from '../src/types';

// Haversine formula to compute great-circle distance in kilometers
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // default reasonable estimation
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

// Estimate urban delivery ETA (minutes) based on distance
export function estimateUrbanEtaMinutes(distanceKm: number): number {
  // Average city courier speed ~ 22 km/h + 6 min pickup/drop handling
  const travelMinutes = (distanceKm / 22) * 60;
  return Math.max(5, Math.round(travelMinutes + 5));
}

// Resolve zone from address components
export function detectZone(options: {
  postal_code?: string;
  area_name?: string;
  zone_id?: string;
  lat?: number;
  lng?: number;
}): { zone: Zone; matchedArea?: ZoneArea } {
  // 1. Direct Zone ID
  if (options.zone_id && db.zones.has(options.zone_id)) {
    return { zone: db.zones.get(options.zone_id)! };
  }

  // 2. Postal Code match
  if (options.postal_code) {
    const cleanPincode = options.postal_code.trim();
    for (const area of db.zone_areas.values()) {
      if (area.postal_code === cleanPincode && area.is_active) {
        const z = db.zones.get(area.zone_id);
        if (z && z.is_active) return { zone: z, matchedArea: area };
      }
    }
  }

  // 3. Area name match
  if (options.area_name) {
    const search = options.area_name.toLowerCase().trim();
    for (const area of db.zone_areas.values()) {
      if (area.is_active && (area.area_name.toLowerCase().includes(search) || search.includes(area.area_name.toLowerCase()))) {
        const z = db.zones.get(area.zone_id);
        if (z && z.is_active) return { zone: z, matchedArea: area };
      }
    }
  }

  // 4. Default fallback: Zone Central or First Active Zone
  const fallback = db.zones.get('zone-central') || Array.from(db.zones.values())[0];
  return { zone: fallback };
}

// Coordinates lookup helper for known Hyderabad hubs
export function getCoordinatesForZoneOrPostal(zoneId: string, postalCode?: string): { lat: number; lng: number } {
  const coords: Record<string, { lat: number; lng: number }> = {
    'zone-west': { lat: 17.4435, lng: 78.3772 }, // HITEC City
    'zone-central': { lat: 17.4156, lng: 78.4350 }, // Banjara Hills
    'zone-north': { lat: 17.4938, lng: 78.3995 }, // Kukatpally
    'zone-south': { lat: 17.3616, lng: 78.4747 }, // Charminar
    'zone-east': { lat: 17.4399, lng: 78.4983 }, // Secunderabad
  };

  if (postalCode) {
    if (postalCode.startsWith('500081') || postalCode.startsWith('500084')) return { lat: 17.4474, lng: 78.3762 };
    if (postalCode.startsWith('500032')) return { lat: 17.4401, lng: 78.3489 };
    if (postalCode.startsWith('500034') || postalCode.startsWith('500033')) return { lat: 17.4245, lng: 78.4120 };
    if (postalCode.startsWith('500072') || postalCode.startsWith('500049')) return { lat: 17.4938, lng: 78.3995 };
    if (postalCode.startsWith('500002') || postalCode.startsWith('500409')) return { lat: 17.3616, lng: 78.4747 };
  }

  return coords[zoneId] || { lat: 17.4156, lng: 78.4350 };
}

// Complete Rate Calculation Engine
export function calculateOrderRate(input: RateCalculationInput): RateCalculationResult {
  // Step 1: Detect Pickup Zone & Drop Zone
  const pickupResolution = detectZone({
    postal_code: input.pickup_postal_code,
    area_name: input.pickup_area,
    zone_id: input.pickup_zone_id,
    lat: input.pickup_lat,
    lng: input.pickup_lng,
  });

  const dropResolution = detectZone({
    postal_code: input.drop_postal_code,
    area_name: input.drop_area,
    zone_id: input.drop_zone_id,
    lat: input.drop_lat,
    lng: input.drop_lng,
  });

  const pickup_zone = pickupResolution.zone;
  const drop_zone = dropResolution.zone;

  // Coordinates resolution
  const pCoords = input.pickup_lat && input.pickup_lng
    ? { lat: input.pickup_lat, lng: input.pickup_lng }
    : getCoordinatesForZoneOrPostal(pickup_zone.id, input.pickup_postal_code);

  const dCoords = input.drop_lat && input.drop_lng
    ? { lat: input.drop_lat, lng: input.drop_lng }
    : getCoordinatesForZoneOrPostal(drop_zone.id, input.drop_postal_code);

  const pickup_to_drop_distance_km = calculateHaversineDistance(
    pCoords.lat,
    pCoords.lng,
    dCoords.lat,
    dCoords.lng
  );
  const pickup_to_drop_eta_min = estimateUrbanEtaMinutes(pickup_to_drop_distance_km);

  // Step 2: Calculate Volumetric Weight: (L × B × H) / 5000
  const l = Math.max(1, Number(input.length) || 10);
  const b = Math.max(1, Number(input.breadth) || 10);
  const h = Math.max(1, Number(input.height) || 10);
  const actual_weight = Math.max(0.1, Number(input.actual_weight) || 0.5);

  const volumetric_raw = (l * b * h) / 5000;
  const volumetric_weight = Math.round(volumetric_raw * 100) / 100;

  // Step 3: Chargeable Weight = MAX(actual, volumetric)
  const chargeable_weight = Math.round(Math.max(actual_weight, volumetric_weight) * 100) / 100;
  const is_volumetric = volumetric_weight > actual_weight;

  // Step 4: Locate active Rate Card matching order_type (B2B or B2C)
  const now = new Date().toISOString();
  let rate_card: RateCard | undefined;

  for (const rc of db.rate_cards.values()) {
    if (rc.is_active && rc.order_type === input.order_type) {
      if (rc.effective_from <= now && rc.effective_to >= now) {
        rate_card = rc;
        break;
      }
    }
  }

  // Fallback if none active in range
  if (!rate_card) {
    for (const rc of db.rate_cards.values()) {
      if (rc.order_type === input.order_type) {
        rate_card = rc;
        break;
      }
    }
  }

  if (!rate_card) {
    rate_card = Array.from(db.rate_cards.values())[0];
  }

  // Step 5: Lookup Zone Rate for (Pickup Zone → Drop Zone) and weight bracket
  let zone_rate: ZoneRate | undefined;

  for (const zr of db.zone_rates.values()) {
    if (
      zr.rate_card_id === rate_card.id &&
      zr.pickup_zone_id === pickup_zone.id &&
      zr.drop_zone_id === drop_zone.id &&
      chargeable_weight >= zr.weight_min &&
      chargeable_weight <= zr.weight_max
    ) {
      zone_rate = zr;
      break;
    }
  }

  // Fallback if exact weight bucket missing: find any rate for this pair or intra-zone fallback
  if (!zone_rate) {
    for (const zr of db.zone_rates.values()) {
      if (
        zr.rate_card_id === rate_card.id &&
        zr.pickup_zone_id === pickup_zone.id &&
        zr.drop_zone_id === drop_zone.id
      ) {
        zone_rate = zr;
        break;
      }
    }
  }

  if (!zone_rate) {
    // Generate synthetic compliant rate
    const isIntra = pickup_zone.id === drop_zone.id;
    zone_rate = {
      id: `zr-synth-${Date.now()}`,
      rate_card_id: rate_card.id,
      pickup_zone_id: pickup_zone.id,
      drop_zone_id: drop_zone.id,
      weight_min: 0,
      weight_max: 100,
      fixed_charge: isIntra ? 45 : 75,
      rate_per_order: isIntra ? 12 : 18,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Step 6: Calculate Base Charge = fixed_charge + (rate_per_order * chargeable_weight)
  const base_charge = Math.round((zone_rate.fixed_charge + (zone_rate.rate_per_order * chargeable_weight)) * 100) / 100;

  // Step 7: Calculate COD Surcharge if COD
  let cod_surcharge = 0;
  let cod_surcharge_rule: CodSurcharge | undefined;

  if (input.payment_type === 'COD') {
    for (const cs of db.cod_surcharges.values()) {
      if (cs.is_active && cs.rate_card_id === rate_card.id && cs.order_type === input.order_type) {
        cod_surcharge_rule = cs;
        break;
      }
    }

    if (!cod_surcharge_rule) {
      for (const cs of db.cod_surcharges.values()) {
        if (cs.is_active && cs.order_type === input.order_type) {
          cod_surcharge_rule = cs;
          break;
        }
      }
    }

    if (cod_surcharge_rule) {
      if (cod_surcharge_rule.surcharge_type === 'FIXED') {
        cod_surcharge = cod_surcharge_rule.surcharge_value;
      } else {
        const rawPerc = (cod_surcharge_rule.surcharge_value / 100) * base_charge;
        cod_surcharge = Math.min(
          cod_surcharge_rule.maximum_charge,
          Math.max(cod_surcharge_rule.minimum_charge, rawPerc)
        );
      }
      cod_surcharge = Math.round(cod_surcharge * 100) / 100;
    } else {
      cod_surcharge = 30.0; // fallback standard COD
    }
  }

  // Step 8: Total Charge
  const total_charge = Math.round((base_charge + cod_surcharge) * 100) / 100;

  return {
    pickup_zone,
    drop_zone,
    volumetric_weight,
    chargeable_weight,
    is_volumetric,
    rate_card,
    zone_rate,
    base_charge,
    cod_surcharge_rule,
    cod_surcharge,
    total_charge,
    pickup_to_drop_distance_km,
    pickup_to_drop_eta_min,
    breakdown: {
      formula: `(L × B × H) / 5000 = (${l} × ${b} × ${h}) / 5000 = ${volumetric_weight} kg`,
      volumetric_calc: `${volumetric_weight} kg volumetric vs ${actual_weight} kg actual`,
      chargeable_rule: `Billed on MAX(${actual_weight}kg, ${volumetric_weight}kg) = ${chargeable_weight} kg (${is_volumetric ? 'Volumetric weight applied' : 'Actual weight applied'})`,
      zone_pair: `${pickup_zone.zone_name} (${pickup_zone.zone_code}) ➔ ${drop_zone.zone_name} (${drop_zone.zone_code}) [${pickup_zone.id === drop_zone.id ? 'INTRA-ZONE' : 'INTER-ZONE'}]`,
      rate_card_applied: `${rate_card.rate_card_name} (${rate_card.order_type})`,
      rate_details: `Base: ₹${zone_rate.fixed_charge} fixed + (₹${zone_rate.rate_per_order}/kg × ${chargeable_weight}kg) = ₹${base_charge}`,
      cod_calc: input.payment_type === 'COD'
        ? `COD Surcharge (${cod_surcharge_rule?.surcharge_type === 'PERCENTAGE' ? `${cod_surcharge_rule.surcharge_value}% (min ₹${cod_surcharge_rule.minimum_charge}, max ₹${cod_surcharge_rule.maximum_charge})` : `Fixed ₹${cod_surcharge}`}) = ₹${cod_surcharge}`
        : 'Prepaid Payment (₹0 COD Surcharge)',
    },
  };
}
