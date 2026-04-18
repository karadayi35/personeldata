import React from 'react';
import { 
  Calendar, 
  Building2, 
  User, 
  Search, 
  Filter, 
  ChevronDown,
  LayoutGrid,
  Tags,
  Clock,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subMonths 
} from 'date-fns';
import { tr } from 'date-fns/locale';

interface PayrollFiltersProps {
  onSearch: (filters: any) => void;
  loading: boolean;
  branches: any[];
}

export default function PayrollFilters({ onSearch, loading, branches }: PayrollFiltersProps) {
  const [filters, setFilters] = React.useState({
    period: format(new Date(), 'yyyy-MM'),
    workHours: '9',
    breakMinutes: '60',
    lateTolerance: '5',
    earlyLeaveTolerance: '0',
    branchId: 'all',
    department: 'all',
    status: 'active',
    groupTag: 'all',
    shiftType: 'all'
  });

  return (
    <div className="space-y-4">
      {/* Primary Calculation Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Dönem (Ay Yıl)</label>
            <input 
              type="month"
              value={filters.period}
              onChange={(e) => setFilters(f => ({ ...f, period: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-whatsapp-500/10 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Günlük Çalışma Süresi</label>
            <select
              value={filters.workHours}
              onChange={(e) => setFilters(f => ({ ...f, workHours: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-whatsapp-500/10 focus:bg-white transition-all appearance-none"
            >
              {[8, 9, 10, 11, 12].map(h => (
                <option key={h} value={h}>{h} saat</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Yemek + Mola (DK)</label>
            <input 
              type="number"
              value={filters.breakMinutes}
              onChange={(e) => setFilters(f => ({ ...f, breakMinutes: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-whatsapp-500/10 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Geç Kalma Tol. (DK)</label>
            <input 
              type="number"
              value={filters.lateTolerance}
              onChange={(e) => setFilters(f => ({ ...f, lateTolerance: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-whatsapp-500/10 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Erken Çıkma Tol. (DK)</label>
            <input 
              type="number"
              value={filters.earlyLeaveTolerance}
              onChange={(e) => setFilters(f => ({ ...f, earlyLeaveTolerance: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-whatsapp-500/10 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => onSearch(filters)}
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 active:scale-95 text-sm uppercase tracking-tight"
          >
            {loading ? <Clock size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Sonuçları Getir</span>
          </button>
        </div>
      </div>

      {/* Secondary Selection Filters */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-whatsapp-50 border border-whatsapp-100 rounded-lg text-[11px] font-black text-whatsapp-700 hover:bg-whatsapp-100 transition-all uppercase tracking-tighter">
          <Filter size={14} />
          Filtreleme Seçenekleri
        </button>
        <select 
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-black text-slate-600 outline-none focus:border-slate-400 transition-all uppercase tracking-tighter"
          value={filters.shiftType}
          onChange={(e) => setFilters(f => ({ ...f, shiftType: e.target.value }))}
        >
          <option value="all">Tüm Çalışma Saatleri</option>
        </select>
        <select 
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-black text-slate-600 outline-none focus:border-slate-400 transition-all uppercase tracking-tighter"
          value={filters.groupTag}
          onChange={(e) => setFilters(f => ({ ...f, groupTag: e.target.value }))}
        >
          <option value="all">Tüm Grup Etiketleri</option>
        </select>
        <select 
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-black text-slate-600 outline-none focus:border-slate-400 transition-all uppercase tracking-tighter"
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="active">Aktif Durumdakiler</option>
          <option value="inactive">Pasif Durumdakiler</option>
          <option value="all">Tümü</option>
        </select>
      </div>
    </div>
  );
}
