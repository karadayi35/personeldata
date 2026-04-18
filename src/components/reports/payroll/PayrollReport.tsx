import React from 'react';
import { 
  FileSpreadsheet, 
  Clock, 
  ArrowLeftRight, 
  CalendarOff,
  Printer,
  FileDown,
  Download,
  Copy,
  Loader2,
  FileJson,
  FileText,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import PayrollFilters from './payroll/PayrollFilters';
import { usePayrollData } from './payroll/usePayrollData';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Sub-components (Will define below to keep file manageable)
import { MonthlyDurationTable } from './payroll/MonthlyDurationTable';
import { EntryExitTable } from './payroll/EntryExitTable';
import { AbsenteeTable } from './payroll/AbsenteeTable';

const TABS = [
  { id: 'monthly-duration', label: 'Toplam Süreler (Aylık)', icon: Clock },
  { id: 'monthly-entry-exit', label: 'Giriş-Çıkış (Aylık)', icon: ArrowLeftRight },
  { id: 'monthly-late-exit', label: 'Geç Çıkışlar (Aylık)', icon: Clock },
  { id: 'weekly-duration', label: 'Süreler (Haftalık)', icon: Clock },
  { id: 'weekly-entry-exit', label: 'Giriş-Çıkış (Haftalık)', icon: ArrowLeftRight },
  { id: 'absentees', label: 'Gelmeyenler', icon: CalendarOff },
];

export default function PayrollReport() {
  const [activeTab, setActiveTab] = React.useState('monthly-duration');
  const [branches, setBranches] = React.useState<any[]>([]);
  const { loading, data, fetchPayrollData } = usePayrollData();

  React.useEffect(() => {
    const loadBranches = async () => {
      const snap = await getDocs(collection(db, 'branches'));
      setBranches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadBranches();
  }, []);

  const handleExport = (type: 'pdf' | 'excel' | 'csv' | 'json') => {
    if (!data) return;
    
    const fileName = `${activeTab}_Raporu_${data.period || format(new Date(), 'yyyy-MM')}`;

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      link.click();
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'monthly-duration') {
      headers = [
        'Sicil', 'Ad Soyad',
        ...data.days.map(d => format(parseISO(d), 'dd')),
        'B. SÜRE TÇ', 'B. SÜRE NM',
        'H. SÜRE TÇ', 'H. SÜRE NM', 'FM', 'FM(RT)', 'EM', 'DZ', 'HT', 'RT', 'Yİ', 'MZ', 'R',
        'B. GÜN ÇG', 'B. GÜN TÇ', 'B. GÜN NM',
        'H. GÜN TÇ', 'H. GÜN NM', 'DZ', 'HT', 'RT', 'Yİ', 'MZ', 'Üİ', 'R'
      ];
      rows = data.employees.map(emp => [
        emp.id.slice(-6).toUpperCase(),
        emp.name,
        ...data.days.map(d => emp.daily[d]?.code || '-'),
        emp.summary.expectedTC?.toFixed(2) || '0.00',
        emp.summary.expectedNM?.toFixed(2) || '0.00',
        emp.summary.calculatedTC?.toFixed(2) || '0.00',
        emp.summary.calculatedNM?.toFixed(2) || '0.00',
        emp.summary.calculatedFM?.toFixed(2) || '0.00',
        emp.summary.calculatedFMRT?.toFixed(2) || '0.00',
        emp.summary.calculatedEM?.toFixed(2) || '0.00',
        emp.summary.calculatedDZ?.toFixed(2) || '0.00',
        emp.summary.calculatedHT?.toFixed(2) || '0.00',
        emp.summary.calculatedRT?.toFixed(2) || '0.00',
        emp.summary.calculatedYI?.toFixed(2) || '0.00',
        emp.summary.calculatedMZ?.toFixed(2) || '0.00',
        emp.summary.calculatedR?.toFixed(2) || '0.00',
        emp.summary.expectedCG || 0,
        emp.summary.expectedTC?.toFixed(0) || '0',
        emp.summary.expectedNM?.toFixed(0) || '0',
        emp.summary.calculatedTC?.toFixed(0) || '0',
        emp.summary.calculatedNM?.toFixed(0) || '0',
        emp.summary.calculatedDZ || 0,
        emp.summary.calculatedHT || 0,
        emp.summary.calculatedRT || 0,
        emp.summary.calculatedYI || 0,
        emp.summary.calculatedMZ || 0,
        emp.summary.calculatedUI || 0,
        emp.summary.calculatedR || 0
      ]);
    } else if (activeTab === 'monthly-entry-exit') {
      headers = ['Sicil', 'Ad Soyad', ...data.days.map(d => format(parseISO(d), 'dd'))];
      rows = data.employees.map(emp => [
        emp.id.slice(-6).toUpperCase(),
        emp.name,
        ...data.days.map(d => emp.daily[d]?.timeLabel || '-')
      ]);
    } else {
      // Default fallback for other tabs
      headers = ['Personel ID', 'Ad Soyad', 'Departman'];
      rows = data.employees.map(emp => [emp.id, emp.name, emp.department || 'Genel']);
    }

    if (type === 'pdf') {
      const orientation = headers.length > 10 ? 'l' : 'p';
      const pageSize = headers.length > 25 ? 'a2' : 'a3';
      const doc = new jsPDF(orientation, 'mm', pageSize);
      
      doc.setFontSize(18);
      doc.text(`${activeTab.toUpperCase()} RAPORU`, 14, 15);
      doc.setFontSize(11);
      doc.text(`Dönem: ${data.period || '-'} | Oluşturma: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 22);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 30,
        styles: { fontSize: headers.length > 40 ? 4 : (headers.length > 20 ? 6 : 8), cellPadding: 1 },
        headStyles: { fillColor: [37, 211, 102] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`${fileName}.pdf`);
    } else if (type === 'excel' || type === 'csv') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapor");
      
      if (type === 'excel') {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        XLSX.writeFile(wb, `${fileName}.csv`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 no-print">
        <div className="space-y-2 print-content">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-whatsapp-600 rounded-2xl flex items-center justify-center shadow-lg shadow-whatsapp-600/20 no-print">
              <FileSpreadsheet className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none uppercase">
                Puantaj Raporları
              </h1>
              <p className="text-sm text-slate-500 font-bold mt-1 tracking-tight">
                Profesyonel personel takip ve verimlilik analizi sistemi
              </p>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all duration-300 uppercase tracking-tighter",
                activeTab === tab.id
                  ? "bg-whatsapp-600 text-white shadow-lg shadow-whatsapp-600/20"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <tab.icon size={16} />
              <span className="hidden xl:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <div className="no-print">
        <PayrollFilters 
          branches={branches} 
          loading={loading} 
          onSearch={fetchPayrollData} 
        />
      </div>

      {/* Main Report Area */}
      <div className={cn(
        "bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[500px] flex flex-col",
        data && "print-content"
      )}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-whatsapp-100 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-whatsapp-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">Veriler Hazırlanıyor</p>
              <p className="text-sm text-slate-400 font-medium tracking-wide">Lütfen bekleyin, puantaj hesaplamaları yapılıyor...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-20 text-center opacity-70 group">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Search size={48} className="text-slate-200" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">Rapor Hazır Değil</p>
              <p className="max-w-xs text-sm text-slate-400 font-medium mx-auto mt-2 leading-relaxed">
                Filtreleri kullanarak bir tarih aralığı ve personel grubu seçip "Sonuçları Getir" butonuna basınız.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Table View */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'monthly-duration' && <MonthlyDurationTable data={data} />}
              {activeTab === 'monthly-entry-exit' && <EntryExitTable data={data} />}
              {activeTab === 'absentees' && <AbsenteeTable data={data} />}
              {/* Fallback for other tabs while developing */}
              {!['monthly-duration', 'monthly-entry-exit', 'absentees'].includes(activeTab) && (
                <div className="p-20 text-center text-slate-400 font-bold italic">
                  Bu rapor türü üzerinde geliştirme çalışmaları devam ediyor...
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                >
                  <Printer size={16} />
                  <span>Yazdır</span>
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                >
                  <FileDown size={16} />
                  <span>PDF Kaydet</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={16} />
                  <span>Excel İndir</span>
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <button 
                  onClick={() => handleExport('json')}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-90"
                  title="JSON Dışa Aktar"
                >
                  <FileJson size={18} />
                </button>
                <button 
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-90"
                  title="Raporu Kopyala"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      {data && (
        <div className="flex flex-wrap items-center gap-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm no-print">
          {[
            { color: 'bg-emerald-500', label: 'Resmi Tatil', code: 'RT' },
            { color: 'bg-emerald-400', label: 'Yıllık İzin', code: 'Yİ' },
            { color: 'bg-sky-400', label: 'Mazeret ve Diğer', code: 'MZ' },
            { color: 'bg-emerald-200', label: 'Raporlu', code: 'R' },
            { color: 'bg-amber-400', label: 'Hafta Tatili', code: 'HT' },
            { color: 'bg-orange-400', label: 'Ücretsiz İzin', code: 'Üİ' },
            { color: 'bg-rose-500', label: 'Devamsız', code: 'DZ' },
            { color: 'bg-rose-700', label: 'Hata ve Uyarı', code: '?' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white", item.color)}>
                {item.code}
              </div>
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
