import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CustomerPortal } from './components/CustomerPortal';
import { RiderDashboard } from './components/RiderDashboard';
import { AdminDispatch } from './components/AdminDispatch';
import { SystemDocView } from './components/SystemDocView';
import { Bell, X, CheckCircle2, AlertCircle, Info, RotateCcw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, liveNotifications, clearNotification } = useAuth();
  const [activeTab, setActiveTab] = useState('customer-orders');

  // Auto-switch primary tab when active persona changes
  useEffect(() => {
    if (currentUser?.role === 'CUSTOMER') {
      setActiveTab('customer-orders');
    } else if (currentUser?.role === 'DELIVERY_AGENT') {
      setActiveTab('agent-dashboard');
    } else if (currentUser?.role === 'ADMIN') {
      setActiveTab('admin-orders');
    }
  }, [currentUser?.role]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Dynamic View Content */}
      <main className="flex-1 pb-12">
        {/* Customer Tab Views */}
        {activeTab === 'customer-orders' && <CustomerPortal initialView="orders" />}
        {activeTab === 'customer-new-order' && <CustomerPortal initialView="new-order" />}

        {/* Rider Tab View */}
        {activeTab === 'agent-dashboard' && <RiderDashboard />}

        {/* Admin Tab Views */}
        {(activeTab === 'admin-orders' ||
          activeTab === 'admin-zones' ||
          activeTab === 'admin-pricing' ||
          activeTab === 'admin-fleet' ||
          activeTab === 'admin-notifs') && (
          <AdminDispatch currentTab={activeTab} setCurrentTab={setActiveTab} />
        )}

        {/* System Schema Documentation */}
        {activeTab === 'system-doc' && <SystemDocView />}
      </main>

      {/* Real-time Floating Notification Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {liveNotifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex items-start space-x-3 transition-all animate-in slide-in-from-right duration-300 ${
              n.type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : n.type === 'error'
                ? 'bg-slate-900 border-rose-500/40 text-rose-300'
                : n.type === 'warning'
                ? 'bg-slate-900 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-blue-500/40 text-blue-300'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {n.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : n.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>

            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{n.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
              </div>
              <p className="text-slate-300 mt-0.5 leading-snug">{n.message}</p>
            </div>

            <button
              onClick={() => clearNotification(n.id)}
              className="text-slate-400 hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
