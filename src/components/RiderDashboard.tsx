import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, DeliveryAgent } from '../types';
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Navigation,
  Phone,
  Clock,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Layers,
  X,
} from 'lucide-react';
import { TrackingModal } from './TrackingModal';

export const RiderDashboard: React.FC = () => {
  const { currentUser, currentAgent, refreshUsers } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [failModalOrder, setFailModalOrder] = useState<Order | null>(null);
  const [failReason, setFailReason] = useState('Customer Premises Closed / No Response');
  const [failRemarks, setFailRemarks] = useState('Attempted calling recipient 3 times at doorstep.');

  // Live Simulated Coordinates state
  const [simLat, setSimLat] = useState(currentAgent?.current_latitude || 17.4485);
  const [simLng, setSimLng] = useState(currentAgent?.current_longitude || 78.3780);
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);

  const loadAgentData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allOrders = await api.getOrders({ agent_id: currentUser.id });
      setOrders(allOrders);
      if (currentAgent) {
        setSimLat(currentAgent.current_latitude);
        setSimLng(currentAgent.current_longitude);
      }
    } catch (err) {
      console.error('Failed to load agent orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, [currentUser, currentAgent]);

  // Handle Availability Toggle
  const handleAvailabilityChange = async (status: string) => {
    if (!currentUser) return;
    try {
      await api.updateAgentAvailability(currentUser.id, status);
      await refreshUsers();
      await loadAgentData();
    } catch (err) {
      console.error('Failed to update availability', err);
    }
  };

  // Move GPS Location in Simulation
  const handleGpsUpdate = async (newLat: number, newLng: number) => {
    if (!currentUser) return;
    setSimLat(newLat);
    setSimLng(newLng);
    try {
      await api.updateAgentLocation(currentUser.id, {
        latitude: newLat,
        longitude: newLng,
        zone_id: currentAgent?.current_zone_id,
      });
      await loadAgentData();
    } catch (err) {
      console.error('Failed to update GPS location', err);
    }
  };

  // Status transitions
  const handleStatusUpdate = async (orderId: string, nextStatus: string, remarks?: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await api.updateOrderStatus(orderId, {
        status: nextStatus,
        changed_by: currentUser.id,
        remarks: remarks || `Status updated by rider ${currentUser.name}`,
      });
      await loadAgentData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  // Report Failed Delivery
  const handleReportFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failModalOrder || !currentUser) return;
    setLoading(true);
    try {
      await api.reportFailedDelivery(failModalOrder.id, {
        agent_id: currentUser.id,
        failure_reason: failReason,
        remarks: failRemarks,
      });
      setFailModalOrder(null);
      await loadAgentData();
      await refreshUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to submit delivery failure');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(
    (o) =>
      o.current_status === 'ASSIGNED' ||
      o.current_status === 'PICKED_UP' ||
      o.current_status === 'IN_TRANSIT' ||
      o.current_status === 'OUT_FOR_DELIVERY'
  );

  const pastOrders = orders.filter(
    (o) => o.current_status === 'DELIVERED' || o.current_status === 'FAILED' || o.current_status === 'CANCELLED'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Rider Header & Availability Controller */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{currentUser?.name}</h2>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                {currentAgent?.employee_code || 'AGT-HYD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vehicle: <span className="font-semibold text-slate-700">{currentAgent?.vehicle_type}</span> • Current Zone: <span className="font-semibold text-slate-700">{currentAgent?.zone?.zone_name || 'Zone West'}</span>
            </p>
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Status:</span>
          {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((st) => (
            <button
              key={st}
              id={`btn-agent-avail-${st.toLowerCase()}`}
              onClick={() => handleAvailabilityChange(st)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition ${
                currentAgent?.availability_status === st
                  ? st === 'AVAILABLE'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : st === 'BUSY'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                    : 'bg-rose-600 border-rose-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic GPS Coordinate Simulator for Rider */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Live GPS Coordinate Simulator & Dynamic Route Engine</h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            ({simLat.toFixed(4)}, {simLng.toFixed(4)})
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Simulate rider coordinate updates to test live distance & ETA calculation (Rider ➔ Pickup changes in real time for customers & dispatchers).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => handleGpsUpdate(17.4474, 78.3762)}
            className="px-3 py-2 bg-slate-50 hover:bg-white hover:border-blue-400 border border-slate-200 text-xs text-slate-700 rounded-lg transition text-left shadow-xs"
          >
            <span className="font-bold text-slate-900 block text-xs">📍 At HITEC Hub</span>
            <span className="text-[10px] text-slate-500 font-mono">Zone West (17.4474, 78.3762)</span>
          </button>
          <button
            onClick={() => handleGpsUpdate(17.4245, 78.4120)}
            className="px-3 py-2 bg-slate-50 hover:bg-white hover:border-blue-400 border border-slate-200 text-xs text-slate-700 rounded-lg transition text-left shadow-xs"
          >
            <span className="font-bold text-slate-900 block text-xs">📍 Jubilee Hills</span>
            <span className="text-[10px] text-slate-500 font-mono">Zone Central (17.4245, 78.4120)</span>
          </button>
          <button
            onClick={() => handleGpsUpdate(17.4938, 78.3995)}
            className="px-3 py-2 bg-slate-50 hover:bg-white hover:border-blue-400 border border-slate-200 text-xs text-slate-700 rounded-lg transition text-left shadow-xs"
          >
            <span className="font-bold text-slate-900 block text-xs">📍 Kukatpally KPHB</span>
            <span className="text-[10px] text-slate-500 font-mono">Zone North (17.4938, 78.3995)</span>
          </button>
          <button
            onClick={() => handleGpsUpdate(17.3616, 78.4747)}
            className="px-3 py-2 bg-slate-50 hover:bg-white hover:border-blue-400 border border-slate-200 text-xs text-slate-700 rounded-lg transition text-left shadow-xs"
          >
            <span className="font-bold text-slate-900 block text-xs">📍 Old City Terminal</span>
            <span className="text-[10px] text-slate-500 font-mono">Zone South (17.3616, 78.4747)</span>
          </button>
        </div>
      </div>

      {/* Active Runs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
            Active Deliveries in Progress ({activeOrders.length})
          </h3>
          <button
            onClick={loadAgentData}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 uppercase tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No Active Runs Pending</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are currently marked as available. New consignments will be auto-assigned to your queue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between transition"
              >
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-black text-slate-800 font-mono">#{ord.order_number}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {ord.order_type} • {ord.payment_type}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-wider ${
                        ord.current_status === 'OUT_FOR_DELIVERY'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {ord.current_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Rider -> Pickup & Pickup -> Drop ETA Meters */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Rider ➔ Pickup</span>
                      <p className="text-xs font-black text-emerald-600 mt-0.5 font-mono">
                        {ord.current_assignment?.agent_to_pickup_distance_km} km (ETA ~{ord.current_assignment?.agent_to_pickup_eta_min}m)
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Pickup ➔ Drop</span>
                      <p className="text-xs font-black text-blue-600 mt-0.5 font-mono">
                        {ord.pickup_to_drop_distance_km} km (ETA ~{ord.pickup_to_drop_eta_min}m)
                      </p>
                    </div>
                  </div>

                  {/* Pickup Location Details */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-blue-600 font-bold mb-1 text-[11px]">
                      <span className="flex items-center space-x-1 uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Pickup: {ord.pickup_address?.contact_name}</span>
                      </span>
                      <span className="text-slate-500 font-mono font-normal">{ord.pickup_address?.contact_phone}</span>
                    </div>
                    <p className="text-slate-700 text-xs">
                      {ord.pickup_address?.address_line_1}, {ord.pickup_address?.area} - {ord.pickup_address?.postal_code}
                    </p>
                  </div>

                  {/* Drop Location Details */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-emerald-600 font-bold mb-1 text-[11px]">
                      <span className="flex items-center space-x-1 uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Drop-off: {ord.drop_address?.contact_name}</span>
                      </span>
                      <span className="text-slate-500 font-mono font-normal">{ord.drop_address?.contact_phone}</span>
                    </div>
                    <p className="text-slate-700 text-xs">
                      {ord.drop_address?.address_line_1}, {ord.drop_address?.area} - {ord.drop_address?.postal_code}
                    </p>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {ord.current_status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, 'PICKED_UP', 'Package collected at sender premises')}
                        className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm shadow-blue-500/20 transition"
                      >
                        ✓ Mark Picked Up
                      </button>
                    )}

                    {ord.current_status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, 'IN_TRANSIT', 'Package moving through transit hub')}
                        className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm shadow-blue-500/20 transition"
                      >
                        🚀 Mark In-Transit
                      </button>
                    )}

                    {ord.current_status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, 'OUT_FOR_DELIVERY', 'Rider on doorstep run to recipient')}
                        className="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm shadow-cyan-500/20 transition"
                      >
                        🛵 Out For Delivery
                      </button>
                    )}

                    {ord.current_status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleStatusUpdate(ord.id, 'DELIVERED', 'Successfully handed over to recipient')}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm shadow-emerald-500/20 transition"
                      >
                        🎉 Complete Delivery
                      </button>
                    )}

                    {/* Report Delivery Failure Button */}
                    <button
                      onClick={() => setFailModalOrder(ord)}
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs uppercase tracking-wider rounded transition"
                    >
                      ⚠️ Report Failed
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedOrder(ord)}
                    className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider transition"
                  >
                    View Audit History & Timeline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Completed Runs Log */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
          Completed / Attempted Delivery Runs ({pastOrders.length})
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Route</th>
                <th className="p-3">Charge</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold font-mono text-blue-600">#{o.order_number}</td>
                  <td className="p-3 font-semibold text-slate-800">{o.pickup_address?.contact_name}</td>
                  <td className="p-3 text-slate-500">
                    {o.pickup_zone?.zone_code} ➔ {o.drop_zone?.zone_code} ({o.pickup_to_drop_distance_km} km)
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900">₹{o.total_charge}</td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        o.current_status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {o.current_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Failed Delivery Modal */}
      {failModalOrder && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleReportFailed}
            className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Log Failed Delivery: #{failModalOrder.order_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setFailModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Reason for Failure</label>
              <select
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Customer Premises Closed / No Response">Customer Premises Closed / No Response</option>
                <option value="Recipient Phone Unreachable / Switched Off">Recipient Phone Unreachable / Switched Off</option>
                <option value="Customer Refused Delivery / Cancelled on Doorstep">Customer Refused Delivery / Cancelled on Doorstep</option>
                <option value="Incorrect Address / Destination Not Found">Incorrect Address / Destination Not Found</option>
                <option value="Severe Weather / Flooding / Road Blockade">Severe Weather / Flooding / Road Blockade</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rider Audit Remarks & Notes</label>
              <textarea
                rows={3}
                required
                value={failRemarks}
                onChange={(e) => setFailRemarks(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                placeholder="Details of attempt (e.g. Ring count, neighbor contact, guard note)..."
              />
            </div>

            <p className="text-[11px] text-rose-600 font-medium">
              * This will record Delivery Attempt, trigger an automated notification to the customer with a reschedule link, and free you up for next dispatch.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setFailModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm"
              >
                {loading ? 'Submitting...' : 'Confirm Failed Attempt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tracking Modal */}
      {selectedOrder && (
        <TrackingModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={(updated) => {
            setSelectedOrder(updated);
            loadAgentData();
          }}
          currentUserRole={currentUser?.role}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
};
