import React from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Coffee, 
  Clock, 
  Building2, 
  ArrowLeftRight, 
  LayoutDashboard,
  ChevronRight,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileDown,
  Loader2,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Sub-components (to be created)
import ReportDashboard from '@/components/reports/ReportDashboard';
import AttendanceReport from '@/components/reports/AttendanceReport';
import PayrollReport from '@/components/reports/PayrollReport';
import LeaveReport from '@/components/reports/LeaveReport';
import BreakReport from '@/components/reports/BreakReport';
import ShiftReport from '@/components/reports/ShiftReport';
import BranchReport from '@/components/reports/BranchReport';
import EntryExitDetailReport from '@/components/reports/EntryExitDetailReport';

import AutoReportModule from '@/components/reports/AutoReportModule';
import SalaryCalculationModule from '@/components/reports/SalaryCalculationModule';

const REPORT_TYPES = [
  { id: 'dashboard', label: 'Özet Dashboard', icon: LayoutDashboard, color: 'text-whatsapp-600', bg: 'bg-whatsapp-50' },
  { id: 'attendance', label: 'Personel Devam Raporu', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'payroll', label: 'Puantaj Raporu', icon: FileSpreadsheet, color: 'text-whatsapp-600', bg: 'bg-whatsapp-50' },
  { id: 'leave', label: 'İzin Raporu', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'break', label: 'Mola Raporu', icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'shift', label: 'Vardiya Raporu', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'branch', label: 'Şube / Departman Raporu', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'entry-exit', label: 'Giriş-Çıkış Detay Raporu', icon: ArrowLeftRight, color: 'text-slate-600', bg: 'bg-slate-50' },
  { id: 'auto-report', label: 'Otomatik Rapor Yollama', icon: FileDown, color: 'text-sky-600', bg: 'bg-sky-50' },
  { id: 'salary', label: 'Maaş Hesaplama', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const activeReport = searchParams.get('type') || 'dashboard';

  const setActiveReport = (type: string) => {
    setSearchParams({ type });
    setIsMobileMenuOpen(false);
  };

  const renderReport = () => {
    switch (activeReport) {
      case 'dashboard': return <ReportDashboard />;
      case 'attendance': return <AttendanceReport />;
      case 'payroll': return <PayrollReport />;
      case 'leave': return <LeaveReport />;
      case 'break': return <BreakReport />;
      case 'shift': return <ShiftReport />;
      case 'branch': return <BranchReport />;
      case 'entry-exit': return <EntryExitDetailReport />;
      case 'auto-report': return <AutoReportModule />;
      case 'salary': return <SalaryCalculationModule />;
      default: return <ReportDashboard />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Report Navigation */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
        <div className="p-2 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 min-w-max">
            {REPORT_TYPES.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={cn(
                  "flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-300 group relative",
                  activeReport === report.id
                    ? "bg-whatsapp-600 text-white shadow-lg shadow-whatsapp-600/20 active:scale-95"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                  activeReport === report.id ? "bg-white/10" : report.bg
                )}>
                  <report.icon size={22} className={activeReport === report.id ? "text-white" : report.color} />
                </div>
                <div className="text-left">
                  <span className={cn(
                    "text-sm font-black uppercase tracking-tight block",
                    activeReport === report.id ? "text-white" : "text-slate-700"
                  )}>
                    {report.label}
                  </span>
                </div>
                {activeReport === report.id && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-whatsapp-600 -z-10 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="min-w-0">
        {renderReport()}
      </main>
    </div>
  );
}
