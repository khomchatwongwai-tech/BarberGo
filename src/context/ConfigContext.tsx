import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlatformSettings } from '../types';

interface ConfigContextType {
  settings: PlatformSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<PlatformSettings>) => Promise<boolean>;
  refreshConfig: () => Promise<void>;
}

const defaultSettings: PlatformSettings = {
  appName: 'BarberGo',
  logoText: 'BarberGo',
  tagline: 'Master Barbers Delivered to Your Door',
  primaryColor: '#0F172A',
  accentColor: '#D97706',
  platformFeePercent: 6.0,
  minPlatformFee: 1.99,
  maxPlatformFee: 12.99,
  taxRatePercent: 8.5,
  cancellationCutoffHours: 24,
  lateCancellationFeePercent: 50,
  emergencyHelpline: '1-800-555-CUTS',
  allowNewBarberRegistration: true,
  maintenanceMode: false,
  supportedCities: [
    'San Francisco, CA',
    'Oakland, CA',
    'San Jose, CA',
    'Los Angeles, CA',
    'New York, NY',
    'Austin, TX',
    'Miami, FL'
  ],
  subscriptionPlans: [
    {
      id: 'solo',
      name: 'Solo Tier',
      pricePerMonth: 19.99,
      bookingLimit: 20,
      description: 'Perfect for part-time or starter mobile barbers.',
      features: ['Up to 20 completed bookings/mo', 'Standard search visibility', 'Stripe Direct Payouts', 'In-app messaging']
    },
    {
      id: 'growth',
      name: 'Growth Tier',
      pricePerMonth: 49.99,
      bookingLimit: 75,
      description: 'Best for active full-time mobile barbers growing clientele.',
      features: ['Up to 75 completed bookings/mo', 'Priority map placement', 'Advanced calendar sync', 'AI Profile & Service Writer', 'Instant Payout capability']
    },
    {
      id: 'professional',
      name: 'Professional Tier',
      pricePerMonth: 89.99,
      bookingLimit: null,
      description: 'Unlimited volume with premium analytics & VIP badge.',
      features: ['Unlimited monthly bookings', 'Top badge & VIP search ranking', 'Dedicated 24/7 priority support', 'Custom marketing tools & SMS blasts', 'Comprehensive tax & revenue export']
    }
  ]
};

const ConfigContext = createContext<ConfigContextType>({
  settings: defaultSettings,
  loading: false,
  updateSettings: async () => false,
  refreshConfig: async () => {}
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  const refreshConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load platform settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const updateSettings = async (newSettings: Partial<PlatformSettings>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update config:', err);
      return false;
    }
  };

  return (
    <ConfigContext.Provider value={{ settings, loading, updateSettings, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
