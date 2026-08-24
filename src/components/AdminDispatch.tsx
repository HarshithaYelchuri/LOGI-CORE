import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Order,
  Zone,
  ZoneArea,
  RateCard,
  ZoneRate,
  CodSurcharge,
  DeliveryAgent,
  Notification,
  User,
} from '../types';
import {
  ShieldCheck,
  Package,
  MapPin,
  Truck,
  DollarSign,
  Radio,
  Search,
  Filter,
  UserCheck,
  Sparkles,
  Edit,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bell,
  Mail,
  Smartphone,
  Eye,
  Sliders,
  X,
  ExternalLink,
  Info,
  Navigation,
} from 'lucide-react';
import { TrackingModal } from './TrackingModal';

interface AdminDispatchProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const AdminDispatch: React.FC<AdminDispatchProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser } = useAuth();

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<ZoneArea[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [zoneRates, setZoneRates] = useState<ZoneRate[]>([]);
  const [codSurcharges, setCodSurcharges] = useState<CodSurcharge[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [agentCandidates, setAgentCandidates] = useState<any[]>([]);
  const [overrideModalOrder, setOverrideModalOrder] = useState<Order | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState('');

  // Admin New Zone / Area Form States
  const [newZoneCode, setNewZoneCode] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [newAreaZoneId, setNewAreaZoneId] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPostal, setNewAreaPostal] = useState('');

  // Admin Rate Matrix Form States
  const [editingRate, setEditingRate] = useState<Partial<ZoneRate> | null>(null);

  // Load all master data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ord, z, a, rc, zr, cod, da, notifs] = await Promise.all([
        api.getOrders(),
        api.getZones(),
        api.getZoneAreas(),
        api.getRateCards(),
        api.getZoneRates(),
        api.getCodSurcharges(),
        api.getAgents(),
        api.getNotifications(),
      ]);
      setOrders(ord);
      setZones(z);
      setAreas(a);
      setRateCards(rc);
      setZoneRates(zr);
      setCodSurcharges(cod);
      setAgents(da);
      setNotifications(notifs);
      if (z.length > 0 && !newAreaZoneId) setNewAreaZoneId(z[0].id);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter && o.current_status !== statusFilter) return false;
    if (zoneFilter && o.pickup_zone_id !== zoneFilter && o.drop_zone_id !== zoneFilter) return false;
    if (agentFilter && o.current_assignment?.agent_id !== agentFilter) return false;
    if (orderTypeFilter && o.order_type !== orderTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        o.order_number.toLowerCase().includes(q) ||
        o.pickup_address?.contact_name.toLowerCase().includes(q) ||
        o.drop_address?.contact_name.toLowerCase().includes(q) ||
        o.customer?.user?.name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Open Assignment Modal & fetch ranked candidates
  const handleOpenAssignModal = async (order: Order) => {
    setAssignModalOrder(order);
    try {
      const candidates = await api.getAgentCandidates(order.id);
      setAgentCandidates(candidates);
    } catch (err) {
      console.error('Failed to load candidates', err);
    }
  };

  // Perform Manual Assignment
  const handleAssignAgent = async (agentId: string) => {
    if (!assignModalOrder || !currentUser) return;
    try {
      await api.assignAgent({
        order_id: assignModalOrder.id,
        agent_id: agentId,
        assigned_by: currentUser.id,
        reason: 'Manual allocation from Dispatcher Hub',
      });
      setAssignModalOrder(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    }
  };

  // 1-Click Auto Assignment
  const handleAutoAssign = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await api.autoAssignOrder(orderId, currentUser.id);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Auto-assignment failed');
    }
  };

  // Handle Admin Status Override
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalOrder || !currentUser) return;
    try {
      await api.overrideOrderStatus(overrideModalOrder.id, {
        new_status: overrideStatus,
        changed_by: currentUser.id,
        reason: overrideReason,
      });
      setOverrideModalOrder(null);
      setOverrideReason('');
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to override status');
    }
  };

  // Create Zone
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneCode || !newZoneName) return;
    try {
      await api.createZone({
        zone_code: newZoneCode,
        zone_name: newZoneName,
        description: newZoneDesc,
        is_active: true,
      });
      setNewZoneCode('');
      setNewZoneName('');
      setNewZoneDesc('');
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to create zone');
    }
  };

  // Create Zone Area
  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaZoneId || !newAreaName || !newAreaPostal) return;
    try {
      await api.createZoneArea({
        zone_id: newAreaZoneId,
        area_name: newAreaName,
        postal_code: newAreaPostal,
        city: 'Hyderabad',
        state: 'Telangana',
      });
      setNewAreaName('');
      setNewAreaPostal('');
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to create area');
    }
  };

  // Delete Zone Area
  const handleDeleteArea = async (id: string) => {
    if (!confirm('Remove this area mapping?')) return;
    try {
      await api.deleteZoneArea(id);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete area');
    }
  };

  // Save Zone Rate
  const handleSaveZoneRate = async (zr: Partial<ZoneRate>) => {
    try {
      await api.saveZoneRate(zr);
      setEditingRate(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to save rate');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-800 mt-2 block font-mono">{orders.length}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {orders.filter((o) => o.current_status === 'OUT_FOR_DELIVERY').length} in active transit
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Riders Active</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-800 mt-2 block font-mono">
            {agents.filter((a) => a.availability_status === 'AVAILABLE' || a.availability_status === 'BUSY').length}
          </span>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
            {agents.filter((a) => a.availability_status === 'AVAILABLE').length} ready for dispatch
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Active Zones</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-800 mt-2 block font-mono">{zones.length}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{areas.length} mapped postal areas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Alerts Sent</span>
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-slate-800 mt-2 block font-mono">{notifications.length}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Email & SMS events triggered</p>
        </div>
      </div>

      {/* SECTION 1: ORDERS & DISPATCH CONSOLE */}
      {currentTab === 'admin-orders' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search Order #, customer name, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="CREATED">CREATED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED UP</option>
                <option value="IN_TRANSIT">IN TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="RESCHEDULED">RESCHEDULED</option>
              </select>

              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zone_name}
                  </option>
                ))}
              </select>

              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Types (B2B/B2C)</option>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>

              <button
                onClick={loadAllData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                title="Refresh Table"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Orders Master Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Type / Mode</th>
                    <th className="p-3.5">Chargeable Weight</th>
                    <th className="p-3.5">Route (Pickup ➔ Drop)</th>
                    <th className="p-3.5">Charges</th>
                    <th className="p-3.5">Assigned Rider</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Dispatch Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-blue-600 block">#{ord.order_number}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">{ord.order_type}</span>
                        <span className="text-[10px] text-slate-500">{ord.payment_type}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{ord.chargeable_weight} kg</span>
                        <span className="text-[10px] text-slate-400">
                          ({ord.length}×{ord.breadth}×{ord.height} cm)
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">
                          {ord.pickup_zone?.zone_code} ➔ {ord.drop_zone?.zone_code}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {ord.pickup_to_drop_distance_km} km (ETA ~{ord.pickup_to_drop_eta_min}m)
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 block">₹{ord.total_charge}</span>
                        <span className="text-[10px] text-slate-500">
                          Base: ₹{ord.base_charge} {ord.cod_surcharge > 0 ? `+ COD ₹${ord.cod_surcharge}` : ''}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {ord.current_assignment ? (
                          <div>
                            <span className="font-bold text-blue-600 block">
                              {ord.current_assignment.agent?.user?.name || ord.current_assignment.agent_id}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {ord.current_assignment.agent_to_pickup_distance_km} km to pickup ({ord.current_assignment.assignment_type})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold uppercase tracking-wider">Unallocated</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            ord.current_status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.current_status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ord.current_status === 'RESCHEDULED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : ord.current_status === 'OUT_FOR_DELIVERY'
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {ord.current_status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Auto Assign button */}
                        {(!ord.current_assignment || ord.current_status === 'CONFIRMED' || ord.current_status === 'RESCHEDULED') && (
                          <button
                            id={`btn-auto-assign-${ord.id}`}
                            onClick={() => handleAutoAssign(ord.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition shadow-sm shadow-blue-500/20"
                            title="Auto-assign nearest rider"
                          >
                            ⚡ Auto Assign
                          </button>
                        )}

                        {/* Manual Assign Modal trigger */}
                        <button
                          onClick={() => handleOpenAssignModal(ord)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider transition"
                        >
                          Rider Pick
                        </button>

                        {/* Admin Status Override */}
                        <button
                          onClick={() => {
                            setOverrideModalOrder(ord);
                            setOverrideStatus(ord.current_status);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider transition"
                          title="Override status"
                        >
                          Override
                        </button>

                        {/* Audit / Tracking modal */}
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider transition border border-blue-200"
                        >
                          Audit Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ZONES & AREAS MANAGEMENT */}
      {currentTab === 'admin-zones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Zones Table & Add Zone (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Delivery Zones Master</span>
              </h3>

              <div className="space-y-2">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-700 text-[10px] bg-blue-100 px-2 py-0.5 rounded">
                          {z.zone_code}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs">{z.zone_name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{z.description}</p>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
                      {areas.filter((a) => a.zone_id === z.id).length} Areas
                    </span>
                  </div>
                ))}
              </div>

              {/* Add New Zone Form */}
              <form onSubmit={handleCreateZone} className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Add New Delivery Zone</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Zone Code (e.g. ZN-06)"
                    value={newZoneCode}
                    onChange={(e) => setNewZoneCode(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Zone Name (e.g. Zone Airport)"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description..."
                  value={newZoneDesc}
                  onChange={(e) => setNewZoneDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm transition"
                >
                  Create Zone
                </button>
              </form>
            </div>
          </div>

          {/* Right: Postal Areas Mapping (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Zone Postal Area Mappings</span>
              </h3>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {areas.map((a) => {
                  const z = zones.find((item) => item.id === a.zone_id);
                  return (
                    <div
                      key={a.id}
                      className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-600">{a.postal_code}</span>
                          <span className="text-slate-800 font-semibold">{a.area_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Zone: {z?.zone_name || a.zone_id}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteArea(a.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete mapping"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add New Area Form */}
              <form onSubmit={handleCreateArea} className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Map Postal Code & Area to Zone</h4>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newAreaZoneId}
                    onChange={(e) => setNewAreaZoneId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.zone_code} - {z.zone_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="PIN (e.g. 500081)"
                    value={newAreaPostal}
                    onChange={(e) => setNewAreaPostal(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Area (e.g. Kondapur)"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm transition"
                >
                  Save Area Mapping
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RATE CARDS & PRICING CONFIGURATION */}
      {currentTab === 'admin-pricing' && (
        <div className="space-y-6">
          {/* Rate Cards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rateCards.map((rc) => (
              <div key={rc.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-blue-600 font-mono tracking-wider">
                    Rate Card: {rc.order_type}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                    ACTIVE
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">{rc.rate_card_name}</h3>
                <p className="text-xs text-slate-500">
                  Effective Period: {new Date(rc.effective_from).toLocaleDateString()} to{' '}
                  {new Date(rc.effective_to).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* COD Surcharges Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>Configurable COD Surcharges</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {codSurcharges.map((cs) => (
                <div key={cs.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-amber-700">{cs.order_type} Surcharge</span>
                    <span className="font-mono text-slate-900">
                      {cs.surcharge_type === 'PERCENTAGE' ? `${cs.surcharge_value}%` : `Fixed ₹${cs.surcharge_value}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bounds: Min ₹{cs.minimum_charge} • Max ₹{cs.maximum_charge}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Zone-to-Zone Rates Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Intra-Zone & Inter-Zone Pricing Matrix</span>
              </h3>
              <span className="text-xs text-slate-500">{zoneRates.length} configured route pairs</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">Rate Card</th>
                    <th className="p-3">Pickup Zone</th>
                    <th className="p-3">Drop Zone</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Fixed Charge</th>
                    <th className="p-3">Rate / Kg</th>
                    <th className="p-3 text-right">Quick Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zoneRates.map((zr) => {
                    const isIntra = zr.pickup_zone_id === zr.drop_zone_id;
                    return (
                      <tr key={zr.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800 font-mono">{zr.rate_card?.order_type || 'B2C'}</td>
                        <td className="p-3">{zr.pickup_zone?.zone_name || zr.pickup_zone_id}</td>
                        <td className="p-3">{zr.drop_zone?.zone_name || zr.drop_zone_id}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isIntra
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isIntra ? 'INTRA-ZONE' : 'INTER-ZONE'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">₹{zr.fixed_charge}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">₹{zr.rate_per_order}/kg</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditingRate(zr)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider p-1"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: LIVE FLEET RADAR */}
      {currentTab === 'admin-fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
              Live Delivery Agent Fleet Monitor
            </h3>
            <button
              onClick={loadAllData}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Fleet Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((ag) => (
              <div
                key={ag.user_id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {ag.employee_code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        ag.availability_status === 'AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ag.availability_status === 'BUSY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {ag.availability_status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-base mt-2">{ag.user?.name || ag.employee_code}</h4>
                  <p className="text-xs text-slate-500">{ag.vehicle_type}</p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Zone:</span>
                      <span className="font-semibold text-slate-800">{ag.zone?.zone_name || 'Zone West'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>GPS:</span>
                      <span className="font-mono text-slate-700 font-medium">
                        {ag.current_latitude?.toFixed(4)}, {ag.current_longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  Last Ping: {new Date(ag.last_location_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: NOTIFICATIONS & AUDIT DISPATCH */}
      {currentTab === 'admin-notifs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
              Customer Email & SMS Dispatch Notifications Stream
            </h3>
            <button
              onClick={loadAllData}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Event</th>
                  <th className="p-3.5">Subject & Content</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString()}{' '}
                      <span className="text-[10px] text-slate-400 block">{new Date(notif.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 w-max ${
                          notif.notification_type === 'EMAIL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {notif.notification_type === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        <span>{notif.notification_type}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-800 font-semibold">{notif.recipient}</td>
                    <td className="p-3.5 font-semibold text-blue-600">{notif.event_type}</td>
                    <td className="p-3.5 max-w-md">
                      <p className="font-bold text-slate-800">{notif.subject}</p>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">{notif.message}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {notif.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Agent Assignment Modal with Ranked Candidates */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4 text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                  Allocate Rider for Order #{assignModalOrder.order_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pickup: {assignModalOrder.pickup_zone?.zone_name} • Drop: {assignModalOrder.drop_zone?.zone_name}
                </p>
              </div>
              <button onClick={() => setAssignModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Ranked Eligible Delivery Agents (Haversine Proximity)
              </h4>

              {agentCandidates.map((cand, idx) => (
                <div
                  key={cand.agent.user_id}
                  className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 flex items-center justify-between hover:border-slate-300 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{cand.agent.user?.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({cand.agent.employee_code})</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            cand.agent.availability_status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {cand.agent.availability_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Distance to Pickup: <strong className="text-blue-600">{cand.distance_km} km</strong> (~
                        {cand.eta_min}m ETA) • {cand.agent.vehicle_type}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssignAgent(cand.agent.user_id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow-sm transition"
                  >
                    Dispatch Rider
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Status Override Modal */}
      {overrideModalOrder && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleOverrideSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                Admin Status Override: #{overrideModalOrder.order_number}
              </h3>
              <button type="button" onClick={() => setOverrideModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CREATED">CREATED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED UP</option>
                <option value="IN_TRANSIT">IN TRANSIT</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="FAILED">FAILED</option>
                <option value="RESCHEDULED">RESCHEDULED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Mandatory Override Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Reason for administrative status adjustment (logged in immutable history)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModalOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm"
              >
                Apply Override
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Zone Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveZoneRate(editingRate);
            }}
            className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Edit Route Pricing Rule</h3>
              <button type="button" onClick={() => setEditingRate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fixed Base Charge (₹)</label>
                <input
                  type="number"
                  required
                  value={editingRate.fixed_charge || 0}
                  onChange={(e) => setEditingRate({ ...editingRate, fixed_charge: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rate Per Kg (₹)</label>
                <input
                  type="number"
                  required
                  value={editingRate.rate_per_order || 0}
                  onChange={(e) => setEditingRate({ ...editingRate, rate_per_order: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm"
              >
                Save Rate Rule
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
            loadAllData();
          }}
          currentUserRole={currentUser?.role}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
};
