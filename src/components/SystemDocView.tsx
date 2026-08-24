import React from 'react';
import { Database, Code2, Cpu, CheckCircle2, ArrowRight, ShieldCheck, Layers, Sparkles } from 'lucide-react';

export const SystemDocView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              System Architecture & Production Database Schema
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Production-ready Last-Mile Delivery Engine adhering strictly to the normalized schema and business rules.
            </p>
          </div>
        </div>
      </div>

      {/* Schema Structure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Authentication */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>1. Authentication & Profiles</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">users (PK: id)</div>
            <div className="text-slate-400 pl-2">role: CUSTOMER | AGENT | ADMIN</div>
            <div className="text-slate-400 pl-2">email (UNIQUE), phone, is_active</div>
            <div className="text-white font-bold pt-1">customers (PK: user_id)</div>
            <div className="text-slate-400 pl-2">customer_type: B2C | B2B, company_name</div>
            <div className="text-white font-bold pt-1">delivery_agents (PK: user_id)</div>
            <div className="text-slate-400 pl-2">employee_code, vehicle_type, status</div>
          </div>
        </div>

        {/* Module 2: Location & Zones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>2. Location & Zone Topology</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">zones (PK: id)</div>
            <div className="text-slate-400 pl-2">zone_code (UNIQUE), zone_name</div>
            <div className="text-white font-bold pt-1">zone_areas (PK: id)</div>
            <div className="text-slate-400 pl-2">zone_id (FK), postal_code, area_name</div>
            <div className="text-white font-bold pt-1">agent_locations (PK: id)</div>
            <div className="text-slate-400 pl-2">agent_id (FK), latitude, longitude</div>
          </div>
        </div>

        {/* Module 3: Orders & Addresses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>3. Orders & Addresses</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">orders (PK: id)</div>
            <div className="text-slate-400 pl-2">order_number (UNIQUE), customer_id (FK)</div>
            <div className="text-slate-400 pl-2">L×B×H, actual_weight, chargeable_weight</div>
            <div className="text-slate-400 pl-2">pickup_zone_id, drop_zone_id, current_status</div>
            <div className="text-white font-bold pt-1">order_addresses (PK: id)</div>
            <div className="text-slate-400 pl-2">order_id (FK), type: PICKUP | DROP</div>
          </div>
        </div>

        {/* Module 4: Pricing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>4. Dynamic Pricing Engine</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">rate_cards (PK: id)</div>
            <div className="text-slate-400 pl-2">order_type: B2C | B2B, effective dates</div>
            <div className="text-white font-bold pt-1">zone_rates (PK: id)</div>
            <div className="text-slate-400 pl-2">pickup_zone_id, drop_zone_id, fixed_charge</div>
            <div className="text-white font-bold pt-1">cod_surcharges (PK: id)</div>
            <div className="text-slate-400 pl-2">order_type, percentage/fixed, bounds</div>
          </div>
        </div>

        {/* Module 5: Assignments & Tracking */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>5. Assignment & Audit History</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">order_assignments (PK: id)</div>
            <div className="text-slate-400 pl-2">order_id, agent_id, assignment_type: AUTO|MANUAL</div>
            <div className="text-slate-400 pl-2">agent_to_pickup_distance_km, eta_min</div>
            <div className="text-white font-bold pt-1">order_status_history (PK: id)</div>
            <div className="text-slate-400 pl-2">old_status, new_status, changed_by, remarks</div>
          </div>
        </div>

        {/* Module 6: Delivery Attempts & Notifs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>6. Delivery Attempts & Comms</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-white font-bold">delivery_attempts (PK: id)</div>
            <div className="text-slate-400 pl-2">attempt_number, failure_reason, remarks</div>
            <div className="text-white font-bold pt-1">reschedules (PK: id)</div>
            <div className="text-slate-400 pl-2">requested_date, reason, requested_by</div>
            <div className="text-white font-bold pt-1">notifications (PK: id)</div>
            <div className="text-slate-400 pl-2">EMAIL | SMS, recipient, event_type, status</div>
          </div>
        </div>
      </div>

      {/* Pricing and Assignment Formula Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-white">Mathematical & Logic Engines</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs uppercase font-bold text-blue-400">1. Volumetric Pricing Equation</h4>
            <div className="font-mono text-xs text-white bg-slate-900 p-3 rounded-lg border border-slate-800">
              Volumetric Weight (kg) = (Length × Breadth × Height) ÷ 5000<br />
              Chargeable Weight = MAX(Actual Weight, Volumetric Weight)<br />
              Total Quote = Fixed Base Charge + (Chargeable Weight × Rate/Kg) + COD Surcharge
            </div>
            <p className="text-[11px] text-slate-400">
              * Rates are queried against the active rate card for B2B vs B2C, factoring intra-zone vs inter-zone rates.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs uppercase font-bold text-emerald-400">2. Rider Auto-Assignment Scoring</h4>
            <div className="font-mono text-xs text-white bg-slate-900 p-3 rounded-lg border border-slate-800">
              Haversine Distance (d) = 2r × arcsin(√[sin²(Δlat/2) + cos(lat1)cos(lat2)sin²(Δlon/2)])<br />
              Score = (Availability Weight) × 0.4 + (Proximity to Pickup) × 0.4 + (Zone Match) × 0.2<br />
              Selection = Top Ranked Eligible Rider within radius
            </div>
            <p className="text-[11px] text-slate-400">
              * Automatically updates rider state, creates order assignment record with ETA, and broadcasts real-time WebSocket events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
