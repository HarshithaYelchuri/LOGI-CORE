import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Customer, DeliveryAgent } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentCustomer: Customer | null;
  currentAgent: DeliveryAgent | null;
  allUsers: User[];
  wsConnected: boolean;
  switchUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  liveNotifications: Array<{ id: string; title: string; message: string; type: string; timestamp: string }>;
  clearNotification: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [currentAgent, setCurrentAgent] = useState<DeliveryAgent | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<
    Array<{ id: string; title: string; message: string; type: string; timestamp: string }>
  >([]);

  const refreshUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
      if (!currentUser && users.length > 0) {
        // Default to Admin or First Customer
        const defaultAdmin = users.find((u) => u.role === 'ADMIN') || users[0];
        await switchUser(defaultAdmin.id);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.login({ user_id: userId });
      setCurrentUser(res.user);
      setCurrentCustomer(res.customer || null);
      setCurrentAgent(res.agent || null);
    } catch (err) {
      console.error('Failed to switch user', err);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  // WebSocket Connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/delivery`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ORDER_STATUS_CHANGED') {
            const p = data.payload;
            addToast(`Status: ${p.order_number}`, `Moved to ${p.new_status?.replace(/_/g, ' ')}`, 'info');
          } else if (data.type === 'AGENT_ASSIGNED') {
            const p = data.payload;
            addToast(`Agent Assigned: ${p.order_number}`, `Rider ${p.agent_name || 'Assigned'} is ${p.distance_km} km away`, 'success');
          } else if (data.type === 'ORDER_FAILED_ATTEMPT') {
            const p = data.payload;
            addToast(`Attempt Failed: ${p.order_number}`, `${p.reason} - Action Required`, 'error');
          } else if (data.type === 'ORDER_RESCHEDULED') {
            const p = data.payload;
            addToast(`Rescheduled: ${p.order_number}`, `New delivery date set to ${p.rescheduled_date}`, 'warning');
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const addToast = (title: string, message: string, type: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setLiveNotifications((prev) => [
      { id, title, message, type, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4),
    ]);

    setTimeout(() => {
      clearNotification(id);
    }, 6000);
  };

  const clearNotification = (id: string) => {
    setLiveNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCustomer,
        currentAgent,
        allUsers,
        wsConnected,
        switchUser,
        refreshUsers,
        liveNotifications,
        clearNotification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
