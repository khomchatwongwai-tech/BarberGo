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
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  customerProfile: CustomerProfile | null;
  barberProfile: BarberProfile | null;
  barberServices: Service[];
  barberAvailability: BarberAvailability | null;
  barberDocuments: BarberDocument[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  loading: boolean;
  isAuthenticated: boolean;
  currentRole: UserRole;
  locationPermission: 'granted' | 'denied' | 'prompt';
  userCoords: { lat: number; lng: number };
  
  // Authentication Actions
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; user?: User }>;
  registerCustomerAccount: (data: { firstName: string; lastName: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  registerBarberAccount: (data: any) => Promise<{ success: boolean; error?: string; user?: User }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string; error?: string }>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  
  // Profile & Verification Actions
  switchRole: (role: UserRole, userId?: string) => Promise<void>;
  updateCustomerProfile: (data: Partial<CustomerProfile> & { fullName?: string; phone?: string; avatarUrl?: string }) => Promise<boolean>;
  updateBarberProfile: (data: Partial<BarberProfile>) => Promise<boolean>;
  verifyContact: (type: 'email' | 'phone') => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  requestLocation: () => Promise<boolean>;
  
  // Modal controllers
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register-customer' | 'register-barber' | 'forgot-password';
  openAuthModal: (mode?: 'login' | 'register-customer' | 'register-barber' | 'forgot-password') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  customerProfile: null,
  barberProfile: null,
  barberServices: [],
  barberAvailability: null,
  barberDocuments: [],
  notifications: [],
  unreadNotificationCount: 0,
  loading: true,
  isAuthenticated: false,
  currentRole: 'customer',
  locationPermission: 'prompt',
  userCoords: { lat: 37.7903, lng: -122.3995 },
  login: async () => ({ success: false }),
  registerCustomerAccount: async () => ({ success: false }),
  registerBarberAccount: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false, message: '' }),
  resetPassword: async () => ({ success: false, message: '' }),
  logout: async () => {},
  signInWithGoogle: async () => ({ success: false }),
  switchRole: async () => {},
  updateCustomerProfile: async () => false,
  updateBarberProfile: async () => false,
  verifyContact: async () => false,
  markNotificationRead: async () => {},
  refreshAuth: async () => {},
  requestLocation: async () => false,
  isAuthModalOpen: false,
  authModalMode: 'login',
  openAuthModal: () => {},
  closeAuthModal: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [barberServices, setBarberServices] = useState<Service[]>([]);
  const [barberAvailability, setBarberAvailability] = useState<BarberAvailability | null>(null);
  const [barberDocuments, setBarberDocuments] = useState<BarberDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('granted');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 37.7903, lng: -122.3995 });
  
  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register-customer' | 'register-barber' | 'forgot-password'>('login');

  const openAuthModal = (mode: 'login' | 'register-customer' | 'register-barber' | 'forgot-password' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Helper to get session token
  const getSessionToken = () => {
    return localStorage.getItem('barbergo_token') || sessionStorage.getItem('barbergo_token');
  };

  const setSessionToken = (token: string, rememberMe: boolean = true) => {
    if (rememberMe) {
      localStorage.setItem('barbergo_token', token);
    } else {
      sessionStorage.setItem('barbergo_token', token);
    }
  };

  const clearSessionToken = () => {
    localStorage.removeItem('barbergo_token');
    sessionStorage.removeItem('barbergo_token');
  };

  const refreshAuth = async () => {
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', { headers });
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
      const notifRes = await fetch('/api/notifications', { headers });
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

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string, rememberMe: boolean = true) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      if (data.token) {
        setSessionToken(data.token, rememberMe);
      }
      setUser(data.user);
      setCustomerProfile(data.customerProfile || null);
      setBarberProfile(data.barberProfile || null);
      closeAuthModal();
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to login server.' };
    } finally {
      setLoading(false);
    }
  };

  const registerCustomerAccount = async (payload: { firstName: string; lastName: string; email: string; phone: string; password: string }) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Customer registration failed.' };
      }

      if (data.token) {
        setSessionToken(data.token, true);
      }
      setUser(data.user);
      setCustomerProfile(data.customerProfile || null);
      closeAuthModal();
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to register customer.' };
    } finally {
      setLoading(false);
    }
  };

  const registerBarberAccount = async (payload: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Barber registration failed.' };
      }

      if (data.token) {
        setSessionToken(data.token, true);
      }
      setUser(data.user);
      setBarberProfile(data.barberProfile || null);
      setBarberServices(data.services || []);
      closeAuthModal();
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to register barber.' };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Failed to send reset link.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: '', error: data.error || 'Password reset failed.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: '', error: err.message || 'Failed to reset password.' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      setFirebaseUser(fbUser);
      
      // Call login endpoint with Google email
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fbUser.email, password: 'Password123!' })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) setSessionToken(data.token, true);
        setUser(data.user);
        setCustomerProfile(data.customerProfile || null);
        setBarberProfile(data.barberProfile || null);
        closeAuthModal();
        return { success: true };
      }
      return { success: false, error: 'Could not sync Google user profile.' };
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, error: error.message || 'Google Sign In failed.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = getSessionToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await firebaseSignOut(auth);
      clearSessionToken();
      setFirebaseUser(null);
      // Switch back to clean state
      await refreshAuth();
    } catch (error) {
      console.error('Sign Out Error:', error);
      clearSessionToken();
    }
  };

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
      const token = getSessionToken();
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
      const token = getSessionToken();
      const res = await fetch(`/api/barbers/${user.id}/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
      const token = getSessionToken();
      const res = await fetch('/api/auth/verify-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
  const isAuthenticated = Boolean(user);
  const currentRole = user?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        customerProfile,
        barberProfile,
        barberServices,
        barberAvailability,
        barberDocuments,
        notifications,
        unreadNotificationCount,
        loading,
        isAuthenticated,
        currentRole,
        locationPermission,
        userCoords,
        login,
        registerCustomerAccount,
        registerBarberAccount,
        forgotPassword,
        resetPassword,
        logout,
        signInWithGoogle,
        switchRole,
        updateCustomerProfile,
        updateBarberProfile,
        verifyContact,
        markNotificationRead,
        refreshAuth,
        requestLocation,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
