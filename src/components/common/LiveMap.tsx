import { useLanguage, useTranslation } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { Navigation, Scissors, ShieldCheck, MapPin, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface BarberPin {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  lat: number;
  lng: number;
  travelRadiusMiles: number;
  basePrice: number;
  isVerified: boolean;
}

interface LiveMapProps {
  userLocation?: { lat: number; lng: number; label?: string };
  barbers?: BarberPin[];
  activeRoute?: {
    barberLocation: { lat: number; lng: number };
    customerLocation: { lat: number; lng: number };
    barberName: string;
    barberAvatar: string;
    estimatedArrival?: string;
  };
  onSelectBarber?: (barberId: string) => void;
  selectedBarberId?: string;
  className?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  userLocation = { lat: 37.7903, lng: -122.3995, label: 'Your Location' },
  barbers = [],
  activeRoute,
  onSelectBarber,
  selectedBarberId,
  className = 'h-96'
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredBarber, setHoveredBarber] = useState<string | null>(null);

  // Center coordinate
  const centerLat = userLocation.lat;
  const centerLng = userLocation.lng;

  // Scale map coordinates to SVG space (0-800 x 0-500)
  const mapWidth = 800;
  const mapHeight = 500;
  const latSpan = 0.08 / zoomLevel;
  const lngSpan = 0.12 / zoomLevel;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (centerLng - lngSpan / 2)) / lngSpan) * mapWidth;
    const y = (((centerLat + latSpan / 2) - lat) / latSpan) * mapHeight;
    return { x: Math.max(20, Math.min(mapWidth - 20, x)), y: Math.max(20, Math.min(mapHeight - 20, y)) };
  };

  const userPoint = project(userLocation.lat, userLocation.lng);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0c121e] shadow-2xl ${className}`} id="barbergo-live-map">
      {/* Map Canvas Background Grid */}
      <svg className="h-full w-full select-none" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
        <defs>
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.4" />
          </pattern>
          <radialGradient id="userRadar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="#0a0f1d" />
        <rect width="100%" height="100%" fill="url(#mapGrid)" />

        {/* Decorative Roads / City Blocks */}
        <path d="M 50 120 Q 250 200 450 180 T 750 350" stroke="#1e293b" strokeWidth="6" fill="none" strokeOpacity="0.7" />
        <path d="M 120 400 Q 300 280 500 320 T 720 100" stroke="#1e293b" strokeWidth="4" fill="none" strokeOpacity="0.5" />
        <path d="M 380 40 L 420 460" stroke="#1e293b" strokeWidth="8" fill="none" strokeOpacity="0.8" />
        <path d="M 80 260 L 720 230" stroke="#1e293b" strokeWidth="6" fill="none" strokeOpacity="0.7" />

        {/* Active Route if Barber is En Route */}
        {activeRoute && (() => {
          const barberPoint = project(activeRoute.barberLocation.lat, activeRoute.barberLocation.lng);
          const custPoint = project(activeRoute.customerLocation.lat, activeRoute.customerLocation.lng);
          return (
            <g>
              {/* Route Line */}
              <line
                x1={barberPoint.x}
                y1={barberPoint.y}
                x2={custPoint.x}
                y2={custPoint.y}
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeDasharray="8 6"
                className="animate-pulse"
              />

              {/* Moving vehicle waypoint */}
              <circle cx={barberPoint.x} cy={barberPoint.y} r="24" fill="url(#userRadar)" />
            </g>
          );
        })()}

        {/* Barber Service Radius Circles */}
        {barbers.map((b) => {
          const pt = project(b.lat, b.lng);
          const isSelected = selectedBarberId === b.id;
          const radiusPixels = b.travelRadiusMiles * 12 * zoomLevel;
          return (
            <g key={`radius-${b.id}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={radiusPixels}
                fill={isSelected ? '#d97706' : '#3b82f6'}
                fillOpacity={isSelected ? 0.12 : 0.04}
                stroke={isSelected ? '#f59e0b' : '#3b82f6'}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity={isSelected ? 0.8 : 0.25}
              />
            </g>
          );
        })}

        {/* Customer Location Pin */}
        <g transform={`translate(${userPoint.x}, ${userPoint.y})`}>
          <circle r="36" fill="url(#userRadar)" className="animate-ping" style={{ animationDuration: '3s' }} />
          <circle r="18" fill="#d97706" fillOpacity="0.25" />
          <circle r="9" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
        </g>
      </svg>

      {/* HTML Overlay Pins for Barbers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Customer Label */}
        <div
          className="absolute -translate-x-1/2 -translate-y-12 transform"
          style={{ left: `${(userPoint.x / mapWidth) * 100}%`, top: `${(userPoint.y / mapHeight) * 100}%` }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-950 shadow-lg backdrop-blur-md">
            <MapPin className="h-3 w-3" />
            <span>{userLocation.label || 'Your Location'}</span>
          </div>
        </div>

        {/* Active En Route Barber Marker */}
        {activeRoute && (() => {
          const bp = project(activeRoute.barberLocation.lat, activeRoute.barberLocation.lng);
          return (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.5 }}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(bp.x / mapWidth) * 100}%`, top: `${(bp.y / mapHeight) * 100}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400 bg-slate-900 shadow-xl shadow-amber-500/30">
                  <img src={activeRoute.barberAvatar} alt={activeRoute.barberName} className="h-11 w-11 rounded-full object-cover" />
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow">
                    <Navigation className="h-3.5 w-3.5 fill-current" />
                  </span>
                </div>
                <div className="mt-1 rounded-md bg-slate-900/95 px-2 py-0.5 text-[11px] font-bold text-amber-400 shadow border border-amber-500/40 whitespace-nowrap">
                  {activeRoute.estimatedArrival ? `ETA: ${activeRoute.estimatedArrival}` : 'En Route (Live GPS)'}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Barber Markers */}
        {barbers.map((barber) => {
          const pt = project(barber.lat, barber.lng);
          const isSelected = selectedBarberId === barber.id;
          const isHovered = hoveredBarber === barber.id;

          return (
            <div
              key={barber.id}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-110"
              style={{ left: `${(pt.x / mapWidth) * 100}%`, top: `${(pt.y / mapHeight) * 100}%`, zIndex: isSelected ? 30 : 20 }}
              onClick={() => onSelectBarber && onSelectBarber(barber.id)}
              onMouseEnter={() => setHoveredBarber(barber.id)}
              onMouseLeave={() => setHoveredBarber(null)}
              id={`barber-marker-${barber.id}`}
            >
              <div className="flex flex-col items-center">
                {/* Info Tooltip */}
                {(isSelected || isHovered) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-1 rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1 text-center shadow-xl backdrop-blur-md whitespace-nowrap"
                  >
                    <p className="text-xs font-bold text-white flex items-center justify-center gap-1">
                      {barber.name}
                      {barber.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />}
                    </p>
                    <p className="text-[10px] text-slate-300">
                      ★ {barber.rating.toFixed(2)} • From ${barber.basePrice}
                    </p>
                  </motion.div>
                )}

                {/* Pin Node */}
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500 shadow-lg shadow-amber-500/50'
                      : 'border-slate-700 bg-slate-900 hover:border-amber-400'
                  }`}
                >
                  <img src={barber.avatar} alt={barber.name} className="h-9 w-9 rounded-full object-cover" />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-slate-950 font-black">
                    <Scissors className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map HUD Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-40">
        <button
          onClick={() => setZoomLevel((z) => Math.min(2.2, z + 0.3))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur-md hover:bg-slate-800 hover:text-white"
          title="Zoom In"
          id="map-zoom-in-btn"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.3))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur-md hover:bg-slate-800 hover:text-white"
          title="Zoom Out"
          id="map-zoom-out-btn"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-amber-400 shadow-lg backdrop-blur-md hover:bg-slate-800"
          title="Reset Center"
          id="map-recenter-btn"
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md shadow-lg">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>You</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
          <span>Mobile Barber (In Travel Radius)</span>
        </span>
      </div>
    </div>
  );
};
