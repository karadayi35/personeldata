import React from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

interface MonthlyDurationTableProps {
  data: {
    employees: any[];
    days: string[];
    range: { startDate: string; endDate: string };
    period?: string;
  };
}

export function MonthlyDurationTable({ data }: MonthlyDurationTableProps) {
  const getCodeColor = (code: string) => {
    switch (code) {
      case 'RT': return 'bg-emerald-500 text-white';
      case 'Yİ': return 'bg-emerald-400 text-white';
      case 'MZ': return 'bg-sky-400 text-white';
      case 'R': return 'bg-emerald-200 text-slate-700';
      case 'HT': return 'bg-amber-400 text-white';
      case 'Üİ': return 'bg-orange-400 text-white';
      case 'DZ': return 'bg-rose-500 text-white';
      case '?': return 'bg-rose-700 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  return (
    <div className="relative border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className={cn(
        "overflow-auto max-h-[70vh] bg-white scrollbar-thin scrollbar-thumb-slate-200",
        "print:max-h-none print:overflow-visible"
      )}>
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-50 bg-slate-50 print:static">
            {/* Top Level Headers */}
            <tr className="bg-slate-100/80">
              <th colSpan={2} className="sticky left-0 z-50 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-left border-b border-r border-slate-200 bg-slate-100">
                Kullanıcı Bilgileri
              </th>
              <th colSpan={data.days.length} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-r border-slate-200">
                {data.period ? format(parse(data.period, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: tr }) : 'Dönem'}
              </th>
              <th colSpan={2} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-r border-slate-200 bg-slate-50/50">
                Beklenen Süre
              </th>
              <th colSpan={11} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-r border-slate-200 bg-emerald-50/30">
                Hesaplanan Süre
              </th>
              <th colSpan={3} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-r border-slate-200 bg-slate-50/50">
                Beklenen Gün
              </th>
              <th colSpan={9} className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-r border-slate-200 bg-emerald-50/30">
                Hesaplanan Gün
              </th>
              <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center border-b border-slate-200">
                İmza
              </th>
            </tr>
            
            {/* Sub-group Headers */}
            <tr className="bg-slate-50">
              {/* User Info Fixed */}
              <th className="sticky left-0 z-50 px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-left border-b border-r border-slate-200 bg-slate-50 w-20">
                Sicil No
              </th>
              <th className="sticky left-20 z-50 px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-left border-b border-r border-slate-200 bg-slate-50 w-44 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                Ad Soyad
              </th>
              
              {/* Daily Numbers */}
              {data.days.map((dateStr, idx) => (
                <th key={idx} className="px-1 py-1 text-[10px] font-bold text-center border-b border-r border-slate-200 min-w-[32px] h-10">
                  {format(parseISO(dateStr), 'd')}
                </th>
              ))}

              {/* Beklenen Süre */}
              <th className="px-2 py-3 text-[9px] font-bold text-slate-500 border-b border-r border-slate-200 bg-slate-50/50 min-w-[50px]">TÇ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-slate-500 border-b border-r border-slate-200 bg-slate-50/50 min-w-[50px]">NM</th>

              {/* Hesaplanan Süre */}
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">TÇ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">NM</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">FM</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">FM (RT)</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">EM</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">DZ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">HT</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">RT</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">Yİ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">MZ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">R</th>

              {/* Beklenen Gün */}
              <th className="px-2 py-3 text-[9px] font-bold text-slate-500 border-b border-r border-slate-200 bg-slate-50/50 min-w-[50px]">ÇG</th>
              <th className="px-2 py-3 text-[9px] font-bold text-slate-500 border-b border-r border-slate-200 bg-slate-50/50 min-w-[50px]">TÇ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-slate-500 border-b border-r border-slate-200 bg-slate-50/50 min-w-[50px]">NM</th>

              {/* Hesaplanan Gün */}
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">TÇ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">NM</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">DZ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">HT</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">RT</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">Yİ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">MZ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">Üİ</th>
              <th className="px-2 py-3 text-[9px] font-bold text-emerald-700 border-b border-r border-slate-200 bg-emerald-50/30 min-w-[50px]">R</th>

              <th className="px-2 py-3 text-[9px] font-bold text-slate-400 border-b border-slate-200 min-w-[80px]">İmza</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((emp) => (
              <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 px-4 py-2 text-[10px] font-mono font-bold text-slate-500 border-b border-r border-slate-100">
                  {emp.id.slice(-6).toUpperCase()}
                </td>
                <td className="sticky left-20 z-30 bg-white group-hover:bg-slate-50 px-4 py-2 text-[11px] font-black text-slate-700 border-b border-r border-slate-200 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">{emp.name}</span>
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter truncate w-32">{emp.department || 'GENEL'}</span>
                  </div>
                </td>

                {data.days.map((day) => {
                  const d = emp.daily[day];
                  return (
                    <td key={day} className="p-0 border-b border-r border-slate-100 group-hover:bg-slate-100/30">
                      <div className="flex flex-col items-center justify-center min-h-[44px] gap-0.5">
                        <div className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black",
                          getCodeColor(d?.code)
                        )}>
                          {d?.code || '-'}
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 scale-[0.85]">{d?.timeLabel}</span>
                      </div>
                    </td>
                  );
                })}

                {/* Summaries */}
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-slate-50/30">{emp.summary.expectedTC.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-slate-50/30">{emp.summary.expectedNM.toFixed(2)}</td>

                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedTC.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedNM.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedFM.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedFMRT.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedEM.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedDZ.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedHT.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedRT.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedYI.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedMZ.toFixed(2)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedR.toFixed(2)}</td>

                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-slate-50/30">{emp.summary.expectedCG}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-slate-50/30">{emp.summary.expectedTC.toFixed(0)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-slate-50/30">{emp.summary.expectedNM.toFixed(0)}</td>

                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedTC.toFixed(0)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedNM.toFixed(0)}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedDZ}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedHT}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedRT}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedYI}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedMZ}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedUI}</td>
                <td className="px-2 py-2 text-[10px] font-bold text-center border-b border-r border-slate-200 bg-emerald-50/20">{emp.summary.calculatedR}</td>

                <td className="border-b border-slate-200"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
