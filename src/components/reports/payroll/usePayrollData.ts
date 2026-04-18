import React from 'react';
import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  format, 
  eachDayOfInterval, 
  parseISO, 
  isWeekend,
  startOfMonth,
  endOfMonth,
  parse
} from 'date-fns';
import { ShiftService } from '@/services/shiftService';

export function usePayrollData() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  const fetchPayrollData = async (filters: any) => {
    setLoading(true);
    try {
      const { period, branchId, status, workHours, breakMinutes, lateTolerance, earlyLeaveTolerance } = filters;
      
      const startDate = format(startOfMonth(parse(period, 'yyyy-MM', new Date())), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(parse(period, 'yyyy-MM', new Date())), 'yyyy-MM-dd');

      // 1. Fetch Basic Data
      const empSnap = await getDocs(collection(db, 'employees'));
      let employees = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (status !== 'all') {
        employees = employees.filter(e => e.status === status);
      }
      if (branchId !== 'all') {
        employees = employees.filter(e => e.branchId === branchId);
      }

      const attendanceSnap = await getDocs(query(
        collection(db, 'attendance_records'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      ));
      const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const leaveSnap = await getDocs(query(
        collection(db, 'leave_records'),
        where('status', '==', 'approved')
      ));
      const leaves = leaveSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const days = eachDayOfInterval({ 
        start: parseISO(startDate), 
        end: parseISO(endDate) 
      });

      // 2. Process each employee
      const processed = await Promise.all(employees.map(async (emp: any) => {
        const empAttendance = attendance.filter(a => a.employeeId === emp.id);
        const empLeaves = leaves.filter(l => l.employeeId === emp.id);
        
        const daily: any = {};
        
        // Sums in Minutes
        let calculatedTC = 0;
        let calculatedNM = 0;
        let calculatedFM = 0;
        let calculatedFMRT = 0;
        let calculatedEM = 0;
        
        // Sums in Days
        let calculatedDZ = 0;
        let calculatedHT = 0;
        let calculatedRT = 0;
        let calculatedYI = 0;
        let calculatedMZ = 0;
        let calculatedR = 0;
        let calculatedUI = 0;

        // Expectations
        let expectedTC = 0;
        let expectedNM = 0;
        let expectedCG = 0;

        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const record = empAttendance.find(a => a.date === dateStr);
          const leave = empLeaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
          const isDayWeekend = isWeekend(day);
          
          const shift = await ShiftService.getActiveShiftForDate(emp.id, dateStr);

          // Calculate Expected
          if (!isDayWeekend) {
            expectedCG++;
            expectedNM += parseInt(workHours) * 60;
            expectedTC += parseInt(workHours) * 60;
          }

          // Determine Code
          let code = '';
          if (record) {
            code = 'RT'; // Normal record
            calculatedTC += record.workedMinutes || 0;
            calculatedNM += Math.min(record.workedMinutes || 0, parseInt(workHours) * 60);
            calculatedFM += record.overtimeMinutes || 0;
            calculatedEM += record.lateMinutes || 0;
          } else if (leave) {
            code = leave.type === 'annual' ? 'Yİ' : (leave.type === 'unpaid' ? 'Üİ' : 'MZ');
            if (code === 'Yİ') calculatedYI++;
            if (code === 'Üİ') calculatedUI++;
            if (code === 'MZ') calculatedMZ++;
          } else if (isDayWeekend) {
            code = 'HT';
            calculatedHT++;
          } else {
            code = 'DZ';
            calculatedDZ++;
          }

          daily[dateStr] = {
            record,
            leave,
            isWeekend: isDayWeekend,
            shift,
            code,
            timeLabel: record ? `${record.startTime || '--:--'} ${record.endTime || '--:--'}` : '-'
          };
        }

        return {
          ...emp,
          daily,
          summary: {
            expectedTC: expectedTC / 60,
            expectedNM: expectedNM / 60,
            expectedCG,
            calculatedTC: calculatedTC / 60,
            calculatedNM: calculatedNM / 60,
            calculatedFM: calculatedFM / 60,
            calculatedFMRT: calculatedFMRT / 60,
            calculatedEM: calculatedEM / 60,
            calculatedDZ,
            calculatedHT,
            calculatedRT,
            calculatedYI,
            calculatedMZ,
            calculatedR,
            calculatedUI,
            totalDays: days.length
          }
        };
      }));

      setData({
        employees: processed,
        days: days.map(d => format(d, 'yyyy-MM-dd')),
        range: { startDate, endDate },
        period
      });

    } catch (error) {
      console.error('Payroll fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, data, fetchPayrollData };
}
