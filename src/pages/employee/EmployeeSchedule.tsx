import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  startOfDay 
} from 'date-fns';
import { tr } from 'date-fns/locale';

export default function EmployeeSchedule() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u && !loading) {
        setError("Lütfen giriş yapın.");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // First find the employee document
        let employeeId = '';
        try {
          console.log("Fetching employee for UID:", user.uid);
          const qEmp = query(collection(db, 'employees'), where('authUid', '==', user.uid));
          const snapEmp = await getDocs(qEmp);
          
          if (snapEmp.empty) {
            console.warn("Employee record not found for UID:", user.uid);
            setError("Personel kaydınız bulunamadı (authUid: " + user.uid + ")");
            setLoading(false);
            return;
          }
          employeeId = snapEmp.docs[0].id;
          console.log("DEBUG: SUCCESSFULLY found Employee ID:", employeeId);
        } catch (e: any) {
          console.error("Error fetching employee doc:", e);
          throw new Error(`Personel kaydı sorgulanırken hata oluştu [employees]: ${e.message}`);
        }

        // Fetch assignments
        try {
          console.log("DEBUG: Fetching assignments - Using employeeId:", employeeId);
          console.log("DEBUG: Also checking if assignments exist for authUid:", user.uid);
          
          const qAss = query(collection(db, 'employee_shift_assignments'), where('employeeId', '==', employeeId), where('isActive', '==', true));
          const snapAss = await getDocs(qAss);
          
          if (snapAss.empty) {
            console.log("DEBUG: No assignments found for Employee ID. Trying Auth UID fallback...");
            const qAssFallback = query(collection(db, 'employee_shift_assignments'), where('employeeId', '==', user.uid), where('isActive', '==', true));
            const snapAssFallback = await getDocs(qAssFallback);
            if (!snapAssFallback.empty) {
              console.log("DEBUG: FOUND assignments using Auth UID instead of Employee ID!");
              setAssignments(snapAssFallback.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
              setAssignments([]);
            }
          } else {
            setAssignments(snapAss.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
          console.log("DEBUG: SUCCESSFULLY processed assignments.");
        } catch (e: any) {
          console.error("Error fetching employee_shift_assignments:", e);
          throw new Error(`Vardiya atamaları alınamadı [employee_shift_assignments]: ${e.message}`);
        }

        // Fetch shifts
        try {
          console.log("Fetching all shifts");
          const snapShifts = await getDocs(collection(db, 'shifts'));
          setShifts(snapShifts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          console.log("DEBUG: SUCCESSFULLY fetched shifts:", snapShifts.docs.length);
        } catch (e: any) {
          console.error("Error fetching shifts:", e);
          throw new Error(`Vardiya tanımları alınamadı [shifts]: ${e.message}`);
        }

        // Fetch overrides
        try {
          console.log("DEBUG: Fetching overrides - Using employeeId:", employeeId);
          const qOver = query(collection(db, 'shift_overrides'), where('employeeId', '==', employeeId));
          const snapOver = await getDocs(qOver);
          
          if (snapOver.empty) {
            console.log("DEBUG: No overrides found for Employee ID. Trying Auth UID fallback...");
            const qOverFallback = query(collection(db, 'shift_overrides'), where('employeeId', '==', user.uid));
            const snapOverFallback = await getDocs(qOverFallback);
            if (!snapOverFallback.empty) {
              console.log("DEBUG: FOUND overrides using Auth UID instead of Employee ID!");
              setOverrides(snapOverFallback.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
              setOverrides([]);
            }
          } else {
            setOverrides(snapOver.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
          console.log("DEBUG: SUCCESSFULLY processed overrides.");
        } catch (e: any) {
          console.error("Error fetching shift_overrides:", e);
          throw new Error(`Vardiya değişiklikleri alınamadı [shift_overrides]: ${e.message}`);
        }
      } catch (err: any) {
        console.error('Error fetching schedule:', err);
        setError(err.message || 'Çalışma planı yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const getDayPlan = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // 1. Check overrides
    const override = overrides.find(o => o.date === dateStr);
    if (override) {
      if (override.overrideType === 'day_off') return { type: 'TATİL', name: 'İzinli', time: '-' };
      return { type: 'ÖZEL', name: 'Özel Vardiya', time: `${override.customStartTime} - ${override.customEndTime}` };
    }

    // 2. Check assignments
    const assignment = assignments.find(a => 
      a.activeDays.includes(dayOfWeek) && 
      a.startDate <= dateStr && 
      (!a.endDate || a.endDate >= dateStr)
    );

    if (assignment) {
      const shift = shifts.find(s => s.id === assignment.shiftId);
      if (shift) return { type: 'VARDİYA', name: shift.name, time: `${shift.startTime} - ${shift.endTime}` };
    }

    return { type: 'TATİL', name: 'Tanımsız', time: 'TATİL' };
  };

  const todayPlan = getDayPlan(new Date());

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="animate-spin text-whatsapp-600" size={32} />
        <p className="text-slate-400 text-sm">Plan yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Hata Oluştu</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-whatsapp-600 text-white rounded-xl font-bold"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, startOfDay(new Date())); // Simple logic for now
          return (
            <button 
              key={i}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[56px] py-3 rounded-2xl transition-all",
                isToday ? "bg-whatsapp-500 text-white shadow-lg shadow-whatsapp-500/30" : "text-slate-400"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">{format(day, 'EEE', { locale: tr })}</span>
              <span className="text-lg font-black">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      {/* Today's Focus Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-whatsapp-500/20 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-whatsapp-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">BUGÜNKÜ PLAN</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest">CANLI</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 text-center">
            {todayPlan.type === 'TATİL' ? (
              <p className="text-white/40 italic text-sm">Bugün için tanımlı vardiya bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight">{todayPlan.time}</h3>
                <p className="text-whatsapp-400 font-bold uppercase tracking-widest text-xs">{todayPlan.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">HAFTALIK PLAN</h3>
        
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-whatsapp-600" />
            </div>
          ) : (
            weekDays.map((day, i) => {
              const plan = getDayPlan(day);
              return (
                <div key={i} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      plan.type === 'TATİL' ? "bg-slate-50 text-slate-300" : "bg-whatsapp-50 text-whatsapp-600"
                    )}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{format(day, 'EEEE', { locale: tr })}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{plan.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                      plan.type === 'TATİL' ? "bg-slate-100 text-slate-400" : "bg-whatsapp-100 text-whatsapp-700"
                    )}>
                      {plan.time}
                    </span>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
