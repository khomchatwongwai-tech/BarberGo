import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  CustomerProfile,
  BarberProfile,
  Service,
  BarberAvailability,
  BarberDocument,
  AppNotification,
  UserRole
} from '../types';

interface AuthContextType {
  user: User | null;
  customerProfile: CustomerProfile | null;
  barberProfile: BarberProfile | null;
  barberServices: Service[];
  barberAvailability: BarberAvailability | null;
  barberDocuments: BarberDocument[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  loading: boolean;
  locationPermission: 'granted' | 'denied' | 'prompt';
  userCoords: { lat: number; lng: number };
  switchRole: (role: UserRole, userId?: string) => Promise<void>;
  updateCustomerProfile: (data: Partial<CustomerProfile> & { fullName?: string; phone?: string; avatarUrl?: string }) => Promise<boolean>;
  updateBarberProfile: (data: Partial<BarberProfile>) => Promise<boolean>;
  verifyContact: (type: 'email' | 'phone') => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  requestLocation: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  customerProfile: null,
  barberProfile: null,
  barberServices: [],
  barberAvailability: null,
  barberDocuments: [],
  notifications: [],
  unreadNotificationCount: 0,
  loading: true,
  locationPermission: 'prompt',
  userCoords: { lat: 37.7903, lng: -122.3995 },
  switchRole: async () => {},
  updateCustomerProfile: async () => false,
  updateBarberProfile: async () => false,
  verifyContact: async () => false,
  markNotificationRead: async () => {},
  refreshAuth: async () => {},
  requestLocation: async () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [barberServices, setBarberServices] = useState<Service[]>([]);
  const [barberAvailability, setBarberAvailability] = useState<BarberAvailability | null>(null);
  const [barberDocuments, setBarberDocuments] = useState<BarberDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('granted');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 37.7903, lng: -122.3995 });

  const refreshAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCustomerProfile(data.customerProfile || null);
        setBarberProfile(data.barberProfile || null);
        setBarberServices(data.services || []);
        setBarberAvailability(data.availability || null);
        setBarberDocuments(data.documents || []);
      }

      // Fetch notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const switchRole = async (role: UserRole, userId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId })
      });
      if (res.ok) {
        await refreshAuth();
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerProfile = async (data: any) => {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await refreshAuth();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update customer profile:', err);
      return false;
    }
  };

  const updateBarberProfile = async (data: Partial<BarberProfile>) => {
    if (!user) return false;
    try {
      const res = await fetch(`/api/barbers/${user.id}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await refreshAuth();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update barber profile:', err);
      return false;
    }
  };

  const verifyContact = async (type: 'email' | 'phone') => {
    try {
      const res = await fetch('/api/auth/verify-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        await refreshAuth();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to verify contact:', err);
      return false;
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const requestLocation = async () => {
    if ('geolocation' in navigator) {
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationPermission('granted');
            resolve(true);
          },
          () => {
            setLocationPermission('denied');
            resolve(false);
          },
          { timeout: 5000 }
        );
      });
    }
    return false;
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        customerProfile,
        barberProfile,
        barberServices,
        barberAvailability,
        barberDocuments,
        notifications,
        unreadNotificationCount,
        loading,
        locationPermission,
        userCoords,
        switchRole,
        updateCustomerProfile,
        updateBarberProfile,
        verifyContact,
        markNotificationRead,
        refreshAuth,
        requestLocation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
