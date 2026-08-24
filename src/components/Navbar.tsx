import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, ShieldCheck, User as UserIcon, Radio, Bell, BookOpen, Layers } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, allUsers, switchUser, wsConnected, liveNotifications } = useAuth();

  return (
    <header id="main-header" className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white shadow-md shadow-blue-500/20 italic">
              L
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white uppercase">LOGI-CORE</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                  DISPATCH v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block uppercase tracking-widest font-semibold">
                Zone Pricing • Auto-Assignment • Real-time Tracking
              </p>
            </div>
          </div>

          {/* Persona / Role Selector & WebSocket Status */}
          <div className="flex items-center space-x-3">
            {/* Live Socket Indicator */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded border ${
                wsConnected
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
              }`}
              title={wsConnected ? 'Real-time WebSocket Stream Active' : 'Connecting to Real-time Stream...'}
            >
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="font-bold text-[11px] hidden md:inline tracking-wider uppercase">{wsConnected ? 'Live Sync' : 'Reconnecting'}</span>
            </div>

            {/* Quick Switch Persona Selector */}
            <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <label htmlFor="persona-select" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 hidden lg:block">
                Role:
              </label>
              <select
                id="persona-select"
                value={currentUser?.id || ''}
                onChange={(e) => switchUser(e.target.value)}
                className="bg-slate-900 text-xs font-semibold text-white px-2.5 py-1 rounded border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <optgroup label="👑 Administration">
                  {allUsers
                    .filter((u) => u.role === 'ADMIN')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (Dispatcher)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🛍️ Customers / Shippers">
                  {allUsers
                    .filter((u) => u.role === 'CUSTOMER')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🛵 Delivery Agents (Riders)">
                  {allUsers
                    .filter((u) => u.role === 'DELIVERY_AGENT')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </optgroup>
              </select>

              {/* Role Badge */}
              {currentUser?.role === 'ADMIN' && (
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30 flex items-center space-x-1 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </span>
              )}
              {currentUser?.role === 'CUSTOMER' && (
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 flex items-center space-x-1 uppercase tracking-wider">
                  <UserIcon className="w-3 h-3" />
                  <span>Customer</span>
                </span>
              )}
              {currentUser?.role === 'DELIVERY_AGENT' && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1 uppercase tracking-wider">
                  <Truck className="w-3 h-3" />
                  <span>Rider</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 pb-2.5 overflow-x-auto text-xs border-t border-slate-800 pt-2">
          {currentUser?.role === 'CUSTOMER' && (
            <>
              <button
                id="tab-cust-orders"
                onClick={() => setActiveTab('customer-orders')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'customer-orders' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'customer-orders' ? 'bg-white' : 'bg-slate-600'}`}></span>
                My Orders & Tracking
              </button>
              <button
                id="tab-cust-new"
                onClick={() => setActiveTab('customer-new-order')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'customer-new-order' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'customer-new-order' ? 'bg-white' : 'bg-slate-600'}`}></span>
                + Book Consignment (Rate Calculator)
              </button>
            </>
          )}

          {currentUser?.role === 'DELIVERY_AGENT' && (
            <button
              id="tab-agent-runs"
              onClick={() => setActiveTab('agent-dashboard')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'agent-dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'agent-dashboard' ? 'bg-white' : 'bg-emerald-500'}`}></span>
              Rider Run Dashboard & GPS Simulator
            </button>
          )}

          {currentUser?.role === 'ADMIN' && (
            <>
              <button
                id="tab-admin-orders"
                onClick={() => setActiveTab('admin-orders')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'admin-orders' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'admin-orders' ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                Control Center (Orders)
              </button>
              <button
                id="tab-admin-zones"
                onClick={() => setActiveTab('admin-zones')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'admin-zones' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'admin-zones' ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                Zone Management
              </button>
              <button
                id="tab-admin-pricing"
                onClick={() => setActiveTab('admin-pricing')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'admin-pricing' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'admin-pricing' ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                Rate Card Matrix
              </button>
              <button
                id="tab-admin-fleet"
                onClick={() => setActiveTab('admin-fleet')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'admin-fleet' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'admin-fleet' ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                Rider Fleet
              </button>
              <button
                id="tab-admin-notifs"
                onClick={() => setActiveTab('admin-notifs')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'admin-notifs' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'admin-notifs' ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                Audit Logs
              </button>
            </>
          )}

          {/* System Architecture & DB Schema Doc Tab available to all */}
          <button
            id="tab-system-doc"
            onClick={() => setActiveTab('system-doc')}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap ml-auto flex items-center gap-2 ${
              activeTab === 'system-doc' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>DB Schema & Arch</span>
          </button>
        </div>
      </div>
    </header>
  );
};
