import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, RateCalculationResult, Zone, ZoneArea } from '../types';
import {
  Package,
  Calculator,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import { TrackingModal } from './TrackingModal';

interface CustomerPortalProps {
  initialView?: 'orders' | 'new-order';
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ initialView = 'orders' }) => {
  const { currentUser } = useAuth();
  const [view, setView] = useState<'orders' | 'new-order'>(initialView);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<ZoneArea[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<RateCalculationResult | null>(null);

  // Form State for Booking
  const [orderType, setOrderType] = useState<'B2C' | 'B2B'>('B2C');
  const [paymentType, setPaymentType] = useState<'PREPAID' | 'COD'>('PREPAID');
  const [length, setLength] = useState<number>(25);
  const [breadth, setBreadth] = useState<number>(20);
  const [height, setHeight] = useState<number>(15);
  const [actualWeight, setActualWeight] = useState<number>(1.5);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);

  // Pickup details
  const [pickupContact, setPickupContact] = useState('Priya Narayanan (TechStore)');
  const [pickupPhone, setPickupPhone] = useState('+919844011223');
  const [pickupAddress1, setPickupAddress1] = useState('Plot 42, Inorbit Mall Road, Madhapur');
  const [pickupArea, setPickupArea] = useState('HITEC City');
  const [pickupPostal, setPickupPostal] = useState('500081');
  const [pickupZoneId, setPickupZoneId] = useState('zone-west');

  // Drop details
  const [dropContact, setDropContact] = useState('Ramesh Varma');
  const [dropPhone, setDropPhone] = useState('+919844998877');
  const [dropAddress1, setDropAddress1] = useState('Flat 302, Emerald Towers, Rd No 36');
  const [dropArea, setDropArea] = useState('Jubilee Hills');
  const [dropPostal, setDropPostal] = useState('500033');
  const [dropZoneId, setDropZoneId] = useState('zone-central');

  // Fetch customer orders & zones on load
  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [ordList, zList, aList] = await Promise.all([
        api.getOrders({ customer_id: currentUser.id }),
        api.getZones(),
        api.getZoneAreas(),
      ]);
      setOrders(ordList);
      setZones(zList);
      setAreas(aList);
    } catch (err) {
      console.error('Failed to load portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Recalculate quote whenever pricing inputs change
  useEffect(() => {
    const fetchQuote = async () => {
      setQuoteLoading(true);
      try {
        const quote = await api.calculatePricing({
          pickup_postal_code: pickupPostal,
          pickup_area: pickupArea,
          pickup_zone_id: pickupZoneId,
          drop_postal_code: dropPostal,
          drop_area: dropArea,
          drop_zone_id: dropZoneId,
          length: Number(length) || 1,
          breadth: Number(breadth) || 1,
          height: Number(height) || 1,
          actual_weight: Number(actualWeight) || 0.1,
          order_type: orderType,
          payment_type: paymentType,
        });
        setQuoteResult(quote);
        if (quote.pickup_zone?.id) setPickupZoneId(quote.pickup_zone.id);
        if (quote.drop_zone?.id) setDropZoneId(quote.drop_zone.id);
      } catch (err) {
        console.warn('Quote calc warning:', err);
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 250);
    return () => clearTimeout(timer);
  }, [
    length,
    breadth,
    height,
    actualWeight,
    orderType,
    paymentType,
    pickupPostal,
    pickupArea,
    pickupZoneId,
    dropPostal,
    dropArea,
    dropZoneId,
  ]);

  // Place Order handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    try {
      const newOrder = await api.createOrder({
        customer_id: currentUser.id,
        created_by: currentUser.id,
        order_type: orderType,
        payment_type: paymentType,
        length: Number(length),
        breadth: Number(breadth),
        height: Number(height),
        actual_weight: Number(actualWeight),
        auto_assign: autoAssign,
        pickup: {
          contact_name: pickupContact,
          contact_phone: pickupPhone,
          address_line_1: pickupAddress1,
          area: pickupArea,
          postal_code: pickupPostal,
          zone_id: pickupZoneId,
        },
        drop: {
          contact_name: dropContact,
          contact_phone: dropPhone,
          address_line_1: dropAddress1,
          area: dropArea,
          postal_code: dropPostal,
          zone_id: dropZoneId,
        },
      });

      await loadData();
      setSelectedOrder(newOrder);
      setView('orders');
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Customer Delivery Portal</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
              {currentUser?.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Book consignments with instant volumetric pricing, track live rider routes, and manage delivery schedules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-view-my-orders"
            onClick={() => setView('orders')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition flex items-center space-x-1.5 ${
              view === 'orders'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Consignments ({orders.length})</span>
          </button>
          <button
            id="btn-view-book-order"
            onClick={() => setView('new-order')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition flex items-center space-x-1.5 ${
              view === 'new-order'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>+ Book Consignment</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MY ORDERS & TRACKING */}
      {view === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">
              Active & Past Consignments
            </h3>
            <button
              onClick={loadData}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Orders</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Orders Placed Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Calculate volumetric rates and schedule your first door-to-door delivery with auto-assigned riders.
              </p>
              <button
                onClick={() => setView('new-order')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-lg shadow-blue-500/20"
              >
                Book First Delivery
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-sm flex flex-col justify-between transition group"
                >
                  <div className="space-y-3">
                    {/* Header: Order Number & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-600 text-base">#{o.order_number}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          {o.order_type}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider ${
                          o.current_status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.current_status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : o.current_status === 'RESCHEDULED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : o.current_status === 'OUT_FOR_DELIVERY'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {o.current_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Zone & Route Summary */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Pickup: </span>
                          <span className="text-slate-900 font-semibold">{o.pickup_zone?.zone_name || 'Pickup Zone'}</span>
                          <p className="text-[11px] text-slate-500 truncate">{o.pickup_address?.contact_name}</p>
                        </div>
                      </div>

                      <div className="border-l-2 border-blue-500/30 ml-1.5 pl-3 py-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {o.pickup_to_drop_distance_km} km route • ETA ~{o.pickup_to_drop_eta_min} min
                        </span>
                      </div>

                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Drop: </span>
                          <span className="text-slate-900 font-semibold">{o.drop_zone?.zone_name || 'Drop Zone'}</span>
                          <p className="text-[11px] text-slate-500 truncate">{o.drop_address?.contact_name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Rider Info or Assignment Status */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {o.current_assignment?.agent?.user?.name
                            ? `Rider: ${o.current_assignment.agent.user.name}`
                            : 'Awaiting Agent'}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">₹{o.total_charge}</span>
                    </div>

                    {/* Failed Alert Banner */}
                    {o.current_status === 'FAILED' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs text-rose-700 flex items-center justify-between font-medium">
                        <span>Attempt failed. Reschedule ready.</span>
                        <span className="font-bold underline text-rose-800">Fix Date</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm shadow-blue-500/20 transition flex items-center space-x-1 uppercase tracking-wider"
                    >
                      <span>Track Route</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: BOOK NEW DELIVERY & LIVE RATE CALCULATOR */}
      {view === 'new-order' && (
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Consignment Specifications */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">1. Package Dimensions & Weight</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Breadth (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={breadth}
                    onChange={(e) => setBreadth(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Actual Wt (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={actualWeight}
                    onChange={(e) => setActualWeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Type & Payment Type Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Order Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('B2C')}
                      className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded border transition ${
                        orderType === 'B2C'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      B2C Retail
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('B2B')}
                      className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded border transition ${
                        orderType === 'B2B'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      B2B Bulk
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('PREPAID')}
                      className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded border transition ${
                        paymentType === 'PREPAID'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Prepaid
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('COD')}
                      className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded border transition ${
                        paymentType === 'COD'
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      COD
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Pickup Address */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">2. Pickup Location Details</h3>
                </div>
                {quoteResult?.pickup_zone && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {quoteResult.pickup_zone.zone_code}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={pickupContact}
                    onChange={(e) => setPickupContact(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Address Line</label>
                <input
                  type="text"
                  required
                  value={pickupAddress1}
                  onChange={(e) => setPickupAddress1(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={pickupPostal}
                    onChange={(e) => setPickupPostal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Area</label>
                  <input
                    type="text"
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Zone</label>
                  <select
                    value={pickupZoneId}
                    onChange={(e) => setPickupZoneId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.zone_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Drop Address */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">3. Drop-off Destination Details</h3>
                </div>
                {quoteResult?.drop_zone && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {quoteResult.drop_zone.zone_code}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={dropContact}
                    onChange={(e) => setDropContact(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recipient Phone</label>
                  <input
                    type="text"
                    required
                    value={dropPhone}
                    onChange={(e) => setDropPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Address Line</label>
                <input
                  type="text"
                  required
                  value={dropAddress1}
                  onChange={(e) => setDropAddress1(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={dropPostal}
                    onChange={(e) => setDropPostal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Area</label>
                  <input
                    type="text"
                    value={dropArea}
                    onChange={(e) => setDropArea(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Zone</label>
                  <select
                    value={dropZoneId}
                    onChange={(e) => setDropZoneId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.zone_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Rate Calculation Engine Breakdown & Confirmation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 sticky top-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Pricing Engine Logic</h3>
                </div>
                {quoteLoading && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Computing...</span>}
              </div>

              {quoteResult ? (
                <div className="space-y-4">
                  {/* Chargeable Weight Math Box */}
                  <div className="p-4 bg-slate-50 border-l-4 border-blue-500 rounded flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="text-slate-400">Volumetric (L×B×H/5000)</span>
                      <span className="text-slate-800 font-mono">{quoteResult.volumetric_weight} kg</span>
                    </div>
                    <div className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="text-slate-400">Actual Weight</span>
                      <span className="text-slate-800 font-mono">{actualWeight} kg</span>
                    </div>
                    <div className="w-full h-px bg-slate-200 my-0.5"></div>
                    <div className="flex justify-between text-xs font-black text-blue-600">
                      <span>Chargeable Weight {quoteResult.is_volumetric ? '(Volumetric)' : '(Actual)'}</span>
                      <span className="font-mono">{quoteResult.chargeable_weight} kg</span>
                    </div>
                  </div>

                  {/* Pricing Matrix Breakdown */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Rate Card:</span>
                      <span className="font-semibold text-slate-800">{quoteResult.rate_card.rate_card_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Zone Route:</span>
                      <span className="font-semibold text-slate-800">
                        {quoteResult.pickup_zone.zone_code} ➔ {quoteResult.drop_zone.zone_code}{' '}
                        <span className="text-[10px] text-blue-600 font-bold">
                          ({quoteResult.pickup_zone.id === quoteResult.drop_zone.id ? 'Intra-Zone' : 'Inter-Zone'})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Est Route:</span>
                      <span className="font-semibold text-slate-800">
                        {quoteResult.pickup_to_drop_distance_km} km (~{quoteResult.pickup_to_drop_eta_min} min)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] font-bold">Base Freight:</span>
                      <span className="font-mono font-bold text-slate-800">₹{quoteResult.base_charge}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] font-bold">COD Surcharge ({paymentType}):</span>
                      <span className="font-mono font-bold text-amber-600">₹{quoteResult.cod_surcharge}</span>
                    </div>
                  </div>

                  {/* Total Quote Highlight */}
                  <div className="bg-slate-900 rounded-xl p-4 text-white flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Total Billable Amount</span>
                      <p className="text-[10px] text-slate-400">All taxes & fuel included</p>
                    </div>
                    <span className="text-2xl font-black text-white font-mono">₹{quoteResult.total_charge}</span>
                  </div>

                  {/* Auto-Assignment Toggle */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-assign-check"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="auto-assign-check" className="text-xs text-slate-700 font-medium">
                      Intelligently auto-assign nearest available rider
                    </label>
                  </div>

                  {/* Confirmation Button */}
                  <button
                    type="submit"
                    id="btn-confirm-order"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-lg shadow-blue-500/20 transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{loading ? 'Confirming...' : `Confirm & Book (₹${quoteResult.total_charge})`}</span>
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Enter consignment details to calculate instant quote.
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Tracking Modal */}
      {selectedOrder && (
        <TrackingModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={(updated) => {
            setSelectedOrder(updated);
            loadData();
          }}
          currentUserRole={currentUser?.role}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
};
