import React, { useState, useEffect } from 'react';
import { Booking } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Scissors,
  Search,
  DollarSign,
  Filter,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Download
} from 'lucide-react';

export const AdminBookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load admin bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleForceRefund = async (bookingId: string) => {
    if (!confirm('Force cancel and issue a 100% refund for this booking?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/bookings/${bookingId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Refund error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchesQuery =
      b.id.toLowerCase().includes(query.toLowerCase()) ||
      b.customerName.toLowerCase().includes(query.toLowerCase()) ||
      b.barberName.toLowerCase().includes(query.toLowerCase()) ||
      b.address.city.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-12" id="admin-bookings-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-serif">Global Booking & Transaction Audit</h1>
          <p className="text-xs text-slate-400">Inspect lifecycle events, addresses, service prices, and refund authorizations</p>
        </div>
        <span className="text-xs text-slate-400">{filtered.length} of {bookings.length} appointments</span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, client name, barber, or city..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="confirmed">Confirmed</option>
          <option value="en_route">En Route</option>
          <option value="arrived">Arrived</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
              <tr>
                <th className="py-2.5">ID</th>
                <th className="py-2.5">Date & Time</th>
                <th className="py-2.5">Client</th>
                <th className="py-2.5">Barber</th>
                <th className="py-2.5">Service</th>
                <th className="py-2.5">Total</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="py-3 font-mono text-slate-400">#{b.id.slice(-6)}</td>
                  <td className="py-3">
                    <span className="font-semibold text-white">{b.date}</span>
                    <span className="block text-[10px] text-slate-500">{b.time}</span>
                  </td>
                  <td className="py-3">{b.customerName}</td>
                  <td className="py-3 font-bold text-amber-400">{b.barberName}</td>
                  <td className="py-3">{b.service.name}</td>
                  <td className="py-3 font-extrabold text-white">${b.pricing.total.toFixed(2)}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 capitalize">
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {b.status !== 'cancelled' ? (
                      <button
                        onClick={() => handleForceRefund(b.id)}
                        disabled={actionLoading}
                        className="rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/30"
                      >
                        Force Refund
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Refunded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
