import React from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface EntryExitTableProps {
  data: {
    employees: any[];
    days: string[];
    range: { startDate: string; endDate: string };
  };
}

export function EntryExitTable({ data }: EntryExitTableProps) {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm');
  };

  return (
    <div className="relative overflow-visible">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-40 bg-slate-50">
          <tr>
            <th className="sticky left-0 z-50 bg-slate-50 px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left border-b border-r border-slate-100 w-24">
              Sicil
            </th>
            <th className="sticky left-24 z-50 bg-slate-50 px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left border-b border-r border-slate-200 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
              Personel
            </th>
            
            {data.days.map((dateStr) => (
              <th 
                key={dateStr} 
                className={cn(
                  "px-2 py-4 text-[10px] font-bold text-center border-b border-r border-slate-100 min-w-[80px]",
                  format(parseISO(dateStr), 'EEEE') === 'Saturday' || format(parseISO(dateStr), 'EEEE') === 'Sunday'
                    ? "text-amber-600 bg-amber-50/30"
                    : "text-slate-500"
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="opacity-50 text-[8px]">{format(parseISO(dateStr), 'EEE').toUpperCase()}</span>
                  <span className="text-sm">{format(parseISO(dateStr), 'dd')}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.employees.map((emp) => (
            <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
              <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 px-6 py-4 text-xs font-mono font-medium text-slate-400 border-b border-r border-slate-100">
                {emp.employeeCode || emp.id.slice(0, 6).toUpperCase()}
              </td>
              <td className="sticky left-24 z-30 bg-white group-hover:bg-slate-50 px-6 py-4 text-xs font-bold text-slate-700 border-b border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                <span>{emp.name}</span>
              </td>

              {data.days.map((dateStr) => {
                const record = emp.daily[dateStr]?.record;
                const status = emp.daily[dateStr]?.status;
                
                return (
                  <td 
                    key={dateStr} 
                    className={cn(
                      "p-1 border-b border-r border-slate-100 text-center transition-colors font-mono",
                      format(parseISO(dateStr), 'EEEE') === 'Saturday' || format(parseISO(dateStr), 'EEEE') === 'Sunday'
                        ? "bg-amber-50/10"
                        : ""
                    )}
                  >
                    {record ? (
                      <div className="flex flex-col items-center leading-none gap-1">
                        <span className="text-[10px] font-bold text-emerald-600">{formatTime(record.checkIn)}</span>
                        {record.checkOut ? (
                          <span className="text-[10px] font-bold text-rose-600">{formatTime(record.checkOut)}</span>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-300">--:--</span>
                        )}
                      </div>
                    ) : (
                      <span className={cn(
                        "text-[9px] font-bold uppercase",
                        status === 'leave' ? "text-emerald-500" : (status === 'weekend' ? "text-amber-500" : "text-slate-300")
                      )}>
                        {status === 'leave' ? 'İzin' : (status === 'weekend' ? 'Tatil' : '-')}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
