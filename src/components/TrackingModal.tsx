import React, { useState } from 'react';
import { Order, OrderStatusHistory, DeliveryAttempt, Reschedule } from '../types';
import {
  X,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  User,
  Calendar,
  Layers,
  Phone,
} from 'lucide-react';
import { api } from '../services/api';

interface TrackingModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdated: (updated: Order) => void;
  currentUserRole?: string;
  currentUserId?: string;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
  currentUserRole,
  currentUserId,
}) => {
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleReason, setRescheduleReason] = useState('Customer requested next available day delivery slot');
  const [autoReassign, setAutoReassign] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const milestones = [
    { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Booked & verified' },
    { key: 'ASSIGNED', label: 'Rider Assigned', desc: 'Agent allocated' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Package collected' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Hub transit / movement' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Final doorstep run' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Handed to recipient' },
  ];

  const getStatusIndex = (st: string) => {
    switch (st) {
      case 'CREATED':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'ASSIGNED':
        return 2;
      case 'PICKED_UP':
        return 3;
      case 'IN_TRANSIT':
        return 4;
      case 'OUT_FOR_DELIVERY':
        return 5;
      case 'DELIVERED':
        return 6;
      case 'FAILED':
        return -1;
      case 'RESCHEDULED':
        return -2;
      default:
        return 1;
    }
  };

  const currentIndex = getStatusIndex(order.current_status);
  const isFailed = order.current_status === 'FAILED';
  const isRescheduled = order.current_status === 'RESCHEDULED';

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.rescheduleOrder(order.id, {
        requested_date: rescheduleDate,
        reason: rescheduleReason,
        requested_by: currentUserId || order.customer_id,
        auto_reassign: autoReassign,
      });
      onOrderUpdated(updated);
      setRescheduleModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base text-slate-800 uppercase tracking-wider">
                  Order Tracking: #{order.order_number}
                </h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider ${
                    order.current_status === 'DELIVERED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : order.current_status === 'FAILED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : order.current_status === 'RESCHEDULED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : order.current_status === 'OUT_FOR_DELIVERY'
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {order.current_status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {order.order_type} • {order.payment_type} • Chargeable Weight: {order.chargeable_weight} kg (Billed at ₹{order.total_charge})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FAILED STATUS BANNER WITH INSTANT RESCHEDULE BUTTON */}
          {isFailed && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-rose-900 text-xs uppercase tracking-wider">Delivery Attempt Failed</h4>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium">
                    {order.attempts && order.attempts.length > 0
                      ? order.attempts[order.attempts.length - 1].failure_reason
                      : 'Customer unavailable or premises locked.'}
                  </p>
                  <p className="text-[11px] text-rose-600 mt-1">
                    Immutable attempt record saved. You can reschedule a new date slot for instant reassignment.
                  </p>
                </div>
              </div>

              <button
                id="btn-trigger-reschedule"
                onClick={() => setRescheduleModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm flex items-center space-x-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reschedule Delivery</span>
              </button>
            </div>
          )}

          {/* RESCHEDULED BANNER */}
          {isRescheduled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3">
              <RotateCcw className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-black text-amber-900 text-xs uppercase tracking-wider">Rescheduled for Delivery</h4>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  {order.reschedules && order.reschedules.length > 0
                    ? `Slot booked for: ${order.reschedules[order.reschedules.length - 1].requested_date} (${order.reschedules[order.reschedules.length - 1].reason})`
                    : 'A new delivery date slot has been recorded.'}
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Route Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Rider -> Pickup Metric */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Rider ➔ Pickup</span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {order.current_assignment ? `${order.current_assignment.agent_to_pickup_distance_km} km` : '—'}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {order.current_assignment ? `ETA ~${order.current_assignment.agent_to_pickup_eta_min} min` : 'Unassigned'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-1 font-medium">
                {order.current_assignment?.agent?.user?.name || 'Awaiting agent allocation'}
              </p>
            </div>

            {/* Pickup -> Drop Metric */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Pickup ➔ Drop Route</span>
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-xl font-black text-slate-800 font-mono">{order.pickup_to_drop_distance_km} km</span>
                <span className="text-xs text-slate-500 font-semibold">ETA ~{order.pickup_to_drop_eta_min} min</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-1 font-medium">
                {order.pickup_zone?.zone_name} ➔ {order.drop_zone?.zone_name}
              </p>
            </div>

            {/* Total Delivery Route */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Total Leg Distance</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {order.current_assignment
                    ? `${(Number(order.current_assignment.agent_to_pickup_distance_km) + Number(order.pickup_to_drop_distance_km)).toFixed(1)} km`
                    : `${order.pickup_to_drop_distance_km} km`}
                </span>
                <span className="text-xs text-emerald-600 font-bold">
                  {order.current_assignment ? `~${order.current_assignment.agent_to_pickup_eta_min + order.pickup_to_drop_eta_min} min total` : 'Direct leg'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-1 font-medium">
                {order.current_assignment?.assignment_type === 'AUTO' ? 'Auto-optimized dispatch' : 'Standard dispatch route'}
              </p>
            </div>
          </div>

          {/* Visual Milestone Progression */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-4">
              Delivery Journey Milestones
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 relative">
              {milestones.map((m, idx) => {
                const isPassed = currentIndex >= idx + 1;
                const isCurrent = currentIndex === idx + 1;

                return (
                  <div
                    key={m.key}
                    className={`flex flex-col items-center text-center p-3 rounded-lg border transition ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : isPassed
                        ? 'bg-white border-emerald-200 text-slate-800'
                        : 'bg-white/60 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                        isCurrent
                          ? 'bg-white text-blue-600'
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="font-bold text-xs leading-tight">{m.label}</span>
                    <span className={`text-[10px] mt-0.5 ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>{m.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pickup and Drop Address Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                <span>Pickup Origin ({order.pickup_zone?.zone_name || 'Zone'})</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{order.pickup_address?.contact_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{order.pickup_address?.contact_phone}</p>
              <p className="text-xs text-slate-700 mt-2">
                {order.pickup_address?.address_line_1}
                {order.pickup_address?.address_line_2 ? `, ${order.pickup_address.address_line_2}` : ''}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {order.pickup_address?.area}, {order.pickup_address?.city} - {order.pickup_address?.postal_code}
              </p>
            </div>

            {/* Drop Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                <span>Drop Destination ({order.drop_zone?.zone_name || 'Zone'})</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{order.drop_address?.contact_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{order.drop_address?.contact_phone}</p>
              <p className="text-xs text-slate-700 mt-2">
                {order.drop_address?.address_line_1}
                {order.drop_address?.address_line_2 ? `, ${order.drop_address.address_line_2}` : ''}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {order.drop_address?.area}, {order.drop_address?.city} - {order.drop_address?.postal_code}
              </p>
            </div>
          </div>

          {/* Delivery Attempts & Reschedules (if any) */}
          {((order.attempts && order.attempts.length > 0) || (order.reschedules && order.reschedules.length > 0)) && (
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                Delivery Attempts & Reschedules Log
              </h4>
              <div className="space-y-2">
                {order.attempts?.map((att) => (
                  <div
                    key={att.id}
                    className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-rose-900">Attempt #{att.attempt_number}</span>
                        <span className="text-rose-700 font-semibold">• {att.outcome}</span>
                        <span className="text-slate-500">({att.scheduled_date})</span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">Reason: {att.failure_reason}</p>
                      {att.remarks && <p className="text-slate-500 italic mt-0.5">"{att.remarks}"</p>}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Rider: {att.agent?.user?.name || att.agent_id}
                    </span>
                  </div>
                ))}

                {order.reschedules?.map((res) => (
                  <div
                    key={res.id}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-amber-900">Rescheduled Slot</span>
                        <span className="text-amber-700 font-semibold">➔ {res.requested_date}</span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">Reason: {res.reason}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Requested: {new Date(res.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immutable Tracking History Audit Trail */}
          <div>
            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-3">
              Immutable Tracking History (Audit Log)
            </h4>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Status Transition</th>
                    <th className="p-3">Actor / Changed By</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.history && order.history.length > 0 ? (
                    order.history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                          <span className="text-[10px] text-slate-400 block">{new Date(h.changed_at).toLocaleDateString()}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            {h.old_status && (
                              <>
                                <span className="text-slate-500">{h.old_status}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                              </>
                            )}
                            <span className="font-bold text-blue-600">{h.new_status}</span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{h.actor?.name || h.changed_by}</span>
                            {h.actor?.role && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                {h.actor.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{h.remarks || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No history logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">Order ID: {order.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px] rounded transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reschedule Date Modal */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRescheduleSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reschedule Delivery #{order.order_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select New Delivery Date</label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Reschedule Reason / Delivery Instructions</label>
              <textarea
                rows={3}
                required
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Please deliver between 2 PM - 5 PM on the next working day."
              />
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <input
                type="checkbox"
                id="auto-reassign-cb"
                checked={autoReassign}
                onChange={(e) => setAutoReassign(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <label htmlFor="auto-reassign-cb" className="text-xs text-slate-700 font-medium">
                Auto-assign nearest available rider for this rescheduled slot
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm flex items-center space-x-1.5"
              >
                {loading ? 'Processing...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
