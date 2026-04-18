import React from 'react';
import { cn } from '@/lib/utils';
import { UserX, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AbsenteeTableProps {
  data: {
    employees: any[];
    days: string[];
    range: { startDate: string; endDate: string };
  };
}

export function AbsenteeTable({ data }: AbsenteeTableProps) {
  // Filter only employees with at least one absent day in the range
  const absentees = data.employees.filter(emp => emp.summary.absentDaysCount > 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
          <UserX className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Gelmeyenler Analizi</h3>
          <p className="text-sm text-slate-500 font-medium">Belirlenen tarih aralığında vardiyasına gelmeyen personellerin listesi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {absentees.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-800">Harika! Gelmeyen Personel Yok</p>
            <p className="text-sm text-slate-400 font-medium">Seçili tarih aralığında tüm personeller vardiyalarına katılım sağladı.</p>
          </div>
        ) : (
          absentees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Sicil: {emp.employeeCode || '-'}</p>
                  <h4 className="text-lg font-extrabold text-slate-800 leading-tight">{emp.name}</h4>
                  <p className="text-xs font-bold text-whatsapp-600 bg-whatsapp-50 px-2.5 py-1 rounded-lg inline-block uppercase tracking-tighter">
                    {emp.department || 'Genel Departman'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-rose-500 leading-none">{emp.summary.absentDaysCount}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gelmeyen Gün</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <Calendar size={18} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Periyot Analizi</p>
                    <p className="text-xs font-bold text-slate-700">
                      {data.days.length} Günlük periyotta %{Math.round((emp.summary.absentDaysCount / data.days.length) * 100)} devamsızlık.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Devamsız Günler</p>
                  <div className="flex flex-wrap gap-2">
                    {data.days.filter(d => emp.daily[d].status === 'absent').map(day => (
                      <span key={day} className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold rounded-xl whitespace-nowrap">
                        {format(parseISO(day), 'd MMMM', { locale: tr })}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Son Giriş:</span>
                  <span className="text-[10px] font-bold text-slate-700">Henüz Giriş Yapmadı</span>
                </div>
                <button className="text-[10px] font-bold text-whatsapp-600 hover:underline uppercase tracking-widest">
                  Detayları Gör
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
