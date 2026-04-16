import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Calendar,
  FileText,
  QrCode,
  Coffee,
  MapPin,
  ChevronRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

type NotificationState = {
  type: 'success' | 'error';
  message: string;
} | null;

type EmployeeData = {
  id: string;
  name?: string;
  branchId?: string;
  authUid?: string;
  [key: string]: any;
} | null;

type BranchData = {
  id: string;
  name?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  [key: string]: any;
} | null;

type ShiftInfo = {
  startTime?: string;
  endTime?: string;
  [key: string]: any;
} | null;

type AttendanceRecord = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  checkOut?: any;
  createdAt?: Timestamp;
  [key: string]: any;
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(auth.currentUser);
  const [employeeData, setEmployeeData] = useState<EmployeeData>(null);
  const [branchData, setBranchData] = useState<BranchData>(null);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'break'>('idle');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrAction, setQrAction] = useState<'check-in' | 'check-out' | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>(null);
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const branchUnsubscribeRef = useRef<(() => void) | null>(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setEmployeeData(null);
        setBranchData(null);
        setShiftInfo(null);
        setStatus('idle');
        setCurrentRecordId(null);
        setRecentRecords([]);
        setError(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    let resolved = false;

    const q = query(collection(db, 'employees'), where('authUid', '==', user.uid));

    const unsubEmp = onSnapshot(
      q,
      (snapshot) => {
        resolved = true;

        if (snapshot.empty) {
          setEmployeeData(null);
          setBranchData(null);
          setLoading(false);
          setError('Personel kaydınız sistemde bulunamadı. Lütfen yöneticinizle iletişime geçin.');
          return;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        setEmployeeData({ id: docSnap.id, ...data });

        if (branchUnsubscribeRef.current) {
          branchUnsubscribeRef.current();
          branchUnsubscribeRef.current = null;
        }

        if (data.branchId) {
          branchUnsubscribeRef.current = onSnapshot(
            doc(db, 'branches', data.branchId),
            (branchSnap) => {
              if (branchSnap.exists()) {
                setBranchData({ id: branchSnap.id, ...branchSnap.data() });
              } else {
                setBranchData(null);
              }
            },
            (branchError) => {
              console.error('Branch data fetch error:', branchError);
              setError(`Şube verisi alınamadı: ${branchError.message}`);
            }
          );
        } else {
          setBranchData(null);
        }
      },
      (empError) => {
        resolved = true;
        console.error('Employee data fetch error:', empError);
        setLoading(false);
        setError(`Personel verisi alınamadı: ${empError.message}`);
      }
    );

    const timeout = setTimeout(() => {
      if (!resolved) {
        setLoading(false);
        setError('Veriler yüklenemedi (Zaman Aşımı). Lütfen sayfayı yenileyin.');
      }
    }, 10000);

    return () => {
      unsubEmp();
      clearTimeout(timeout);

      if (branchUnsubscribeRef.current) {
        branchUnsubscribeRef.current();
        branchUnsubscribeRef.current = null;
      }

      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [user]);

  useEffect(() => {
    if (!employeeData?.id) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const qStatus = query(
      collection(db, 'attendance_records'),
      where('employeeId', '==', employeeData.id),
      where('date', '==', todayStr),
      where('status', '==', 'working')
    );

    const unsubStatus = onSnapshot(
      qStatus,
      (snapshot) => {
        if (!snapshot.empty) {
          setStatus('working');
          setCurrentRecordId(snapshot.docs[0].id);
        } else {
          setStatus('idle');
          setCurrentRecordId(null);
        }
        setLoading(false);
      },
      (statusError) => {
        console.error('Status fetch error:', statusError);
        setLoading(false);
        setNotification({ type: 'error', message: `Durum bilgisi alınamadı: ${statusError.message}` });
      }
    );

    const recentQ = query(
      collection(db, 'attendance_records'),
      where('employeeId', '==', employeeData.id),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubRecent = onSnapshot(
      recentQ,
      (snapshot) => {
        setRecentRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[]);
      },
      (recordsError) => {
        console.error('Recent records fetch error:', recordsError);
      }
    );

    const fetchShift = async () => {
      try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const todayStrInner = format(today, 'yyyy-MM-dd');

        const qAssignments = query(
          collection(db, 'employee_shift_assignments'),
          where('employeeId', '==', employeeData.id),
          where('isActive', '==', true)
        );

        const assignmentSnap = await getDocs(qAssignments);

        const assignment = assignmentSnap.docs.find((d) => {
          const data = d.data();
          const activeDays = Array.isArray(data.activeDays) ? data.activeDays : [];
          return (
            activeDays.includes(dayOfWeek) &&
            data.startDate <= todayStrInner &&
            (!data.endDate || data.endDate >= todayStrInner)
          );
        });

        if (!assignment) {
          setShiftInfo(null);
          return;
        }

        const shiftId = assignment.data().shiftId;
        const shiftSnap = await getDocs(query(collection(db, 'shifts'), where('__name__', '==', shiftId)));

        if (!shiftSnap.empty) {
          setShiftInfo(shiftSnap.docs[0].data());
        } else {
          setShiftInfo(null);
        }
      } catch (shiftError: any) {
        console.error('Shift fetch error:', shiftError);
        setShiftInfo(null);
      }
    };

    fetchShift();

    return () => {
      unsubStatus();
      unsubRecent();
    };
  }, [employeeData?.id]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const closeScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current?.clear();
    } catch (scannerError) {
      console.error('Scanner stop error:', scannerError);
    } finally {
      html5QrCodeRef.current = null;
      setIsQRScannerOpen(false);
      setQrAction(null);
    }
  };

  const handleTestAttendanceWrite = async () => {
    alert("Test attendance yazısı başlatıldı");
    if (!employeeData || !branchData) {
      alert("Hata: Employee veya Branch verisi eksik. Önce verilerin yüklenmesini bekleyin.");
      return;
    }

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      alert("Test kaydı Firestore'a yazılmak üzere hazırlanıyor...");
      
      const docRef = await addDoc(collection(db, 'attendance_records'), {
        employeeId: employeeData.id,
        employeeName: employeeData.name || '',
        authUid: user?.uid || null,
        branchId: branchData.id,
        branchName: branchData.name || '',
        date: todayStr,
        checkIn: serverTimestamp(),
        checkOut: null,
        method: 'TEST',
        status: 'working',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      alert("SUCCESS: attendance kaydı oluşturuldu! ID: " + docRef.id);
      setNotification({ type: 'success', message: 'Test kaydı başarıyla oluşturuldu.' });
    } catch (error: any) {
      console.error("Test write error:", error);
      alert("attendance write hatası: " + error.message);
      setNotification({ type: 'error', message: "Test yazma hatası: " + error.message });
    }
  };

  const processCheckIn = async () => {
    alert("processCheckIn başladı");
    setNotification({ type: 'success', message: 'DEBUG: processCheckIn başladı' });
    console.log('DEBUG: processCheckIn started');

    if (!branchData || !employeeData) {
      setNotification({ type: 'error', message: 'Hata: Personel veya şube verisi eksik.' });
      return;
    }

    setActionLoading(true);

    try {
      // Use lastPosition if available, otherwise fetch again
      let position = lastPosition;

      if (!position) {
        setNotification({ type: 'success', message: 'DEBUG: Konum yeniden isteniyor...' });
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
      }

      const { latitude, longitude } = position.coords;

      if (
        typeof branchData.lat !== 'number' ||
        typeof branchData.lng !== 'number'
      ) {
        setNotification({ type: 'error', message: 'Şube konum bilgileri eksik.' });
        return;
      }

      const distance = calculateDistance(latitude, longitude, branchData.lat, branchData.lng);
      const allowedRadius = branchData.radius || 100;

      console.log('DEBUG Check-in:', {
        branchId: branchData.id,
        distance,
        allowedRadius,
        latitude,
        longitude
      });

      if (distance > allowedRadius) {
        setNotification({
          type: 'error',
          message: `Hata: Şube kapsama alanı dışındasınız. (${Math.round(distance)}m) İzin verilen: ${allowedRadius}m`,
        });
        return;
      }

      setNotification({ type: 'success', message: 'DEBUG: Konum doğrulandı' });

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      setNotification({ type: 'success', message: 'DEBUG: attendance kaydı yazılıyor' });
      console.log('DEBUG: attendance kaydı yazılıyor to attendance_records');
      alert("attendance yazılıyor");

      let docRef;
      try {
        docRef = await addDoc(collection(db, 'attendance_records'), {
          employeeId: employeeData.id,
          employeeName: employeeData.name || '',
          authUid: user?.uid || null,
          branchId: branchData.id,
          branchName: branchData.name || '',
          date: todayStr,
          checkIn: serverTimestamp(),
          checkOut: null,
          method: 'QR',
          location: {
            lat: latitude,
            lng: longitude,
            isWithinRadius: true,
            distance: Math.round(distance),
          },
          status: 'working',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert("attendance yazıldı");
        setNotification({ type: 'success', message: 'DEBUG: attendance kaydı oluşturuldu' });
        console.log('DEBUG: attendance kaydı oluşturuldu, ID:', docRef.id);
      } catch (firestoreError: any) {
        console.error('CRITICAL: Firestore write hatası:', firestoreError);
        setNotification({ 
          type: 'error', 
          message: `Firestore write hatası: ${firestoreError.message || 'Yetki hatası veya ağ sorunu'}` 
        });
        handleFirestoreError(firestoreError, OperationType.CREATE, 'attendance_records');
        return;
      }

      setStatus('working');
      setCurrentRecordId(docRef.id);

      setNotification({
        type: 'success',
        message: 'Giriş başarılı! İyi çalışmalar.',
      });

      setTimeout(() => {
        navigate('/mobile/records');
      }, 1200);
    } catch (checkInError: any) {
      console.error('Check-in error:', checkInError);

      let msg = `Giriş işlemi başarısız oldu. (Kod: ${checkInError?.code || 'vok'}, Mesaj: ${checkInError?.message || 'vok'})`;
      if (checkInError?.code === 1) {
        msg = `Konum hatası: code 1. Lütfen tarayıcı ayarlarından konum izni verin.`;
      } else if (checkInError?.code === 2) {
        msg = `Konum hatası: code 2. Konum alınamadı.`;
      } else if (checkInError?.code === 3) {
        msg = `Konum hatası: code 3. Konum alma zaman aşımına uğradı.`;
      }

      setNotification({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const processCheckOut = async () => {
    setNotification({ type: 'success', message: 'DEBUG: processCheckOut başladı' });
    if (!currentRecordId) {
      setNotification({ type: 'error', message: 'Hata: Aktif çalışma kaydı bulunamadı.' });
      return;
    }

    setActionLoading(true);

    try {
      const docRef = doc(db, 'attendance_records', currentRecordId);

      setNotification({ type: 'success', message: 'DEBUG: attendance kaydı güncelleniyor' });
      
      try {
        await updateDoc(docRef, {
          checkOut: serverTimestamp(),
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
        setNotification({ type: 'success', message: 'DEBUG: attendance kaydı güncellendi' });
      } catch (firestoreError: any) {
        console.error('CRITICAL: Firestore update hatası:', firestoreError);
        setNotification({ 
          type: 'error', 
          message: `Firestore update hatası: ${firestoreError.message || 'Yetki hatası veya ağ sorunu'}` 
        });
        handleFirestoreError(firestoreError, OperationType.UPDATE, `attendance_records/${currentRecordId}`);
        return;
      }

      setStatus('idle');
      setCurrentRecordId(null);

      setNotification({
        type: 'success',
        message: 'Çıkış başarılı! İyi dinlenmeler.',
      });

      setTimeout(() => {
        navigate('/mobile/records');
      }, 1200);
    } catch (checkOutError: any) {
      console.error('Check-out error:', checkOutError);
      setNotification({
        type: 'error',
        message: `Çıkış hatası: ${checkOutError.message || 'İşlem başarısız oldu.'}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleQRScan = async (decodedText: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    console.log('DEBUG QR Scan:', {
      branchId: branchData?.id,
      decodedText
    });
    setNotification({ type: 'success', message: 'DEBUG: QR okundu' });

    if (!branchData) {
      setNotification({ type: 'error', message: 'Hata: Şube verisi yüklenemedi. Lütfen sayfayı yenileyin.' });
      await closeScanner();
      scanLockRef.current = false;
      return;
    }

    const scannedId = decodedText.includes('/')
      ? decodedText.split('/').filter(Boolean).pop()
      : decodedText.trim();

    console.log('DEBUG QR Parse:', { scannedId });

    if (scannedId !== branchData.id) {
      setNotification({
        type: 'error',
        message: `Hata: Yanlış şube QR kodu! (Okunan: ${scannedId}, Beklenen: ${branchData.id})`,
      });
      await closeScanner();
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1500);
      return;
    }

    setNotification({
      type: 'success',
      message: 'DEBUG: QR doğrulandı, işlem başlatılıyor...',
    });

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    await closeScanner();

    if (qrAction === 'check-in') {
      setNotification({ type: 'success', message: 'DEBUG: Check-in işlemi başlatılıyor' });
      await processCheckIn();
    } else if (qrAction === 'check-out') {
      setNotification({ type: 'success', message: 'DEBUG: Check-out işlemi başlatılıyor' });
      await processCheckOut();
    }

    setTimeout(() => {
      scanLockRef.current = false;
    }, 1500);
  };

  const startScanner = async (action: 'check-in' | 'check-out') => {
    if (!employeeData) {
      setNotification({ type: 'error', message: 'Hata: Personel verisi henüz yüklenmedi.' });
      return;
    }

    if (!branchData) {
      setNotification({ type: 'error', message: 'Hata: Şube verisi bulunamadı. Lütfen yöneticinizle iletişime geçin.' });
      return;
    }

    setNotification({ type: 'success', message: `DEBUG: ${action === 'check-in' ? 'Giriş' : 'Çıkış'} butonuna basıldı` });

    setActionLoading(true);
    setNotification({ type: 'success', message: 'DEBUG: Konum izni kontrol ediliyor...' });

    try {
      // Request location permission before opening scanner
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setNotification({ type: 'success', message: 'DEBUG: Konum alındı, kamera açılıyor...' });
      
      setLastPosition(position);
      setQrAction(action);
      setIsQRScannerOpen(true);
      setActionLoading(false);

      // Initialize scanner in next tick
      setTimeout(() => {
        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            async (decodedText: string) => {
              await handleQRScan(decodedText);
            },
            () => {
              // ignore parse errors
            }
          )
          .catch((scannerErr) => {
            console.error('Kamera başlatılamadı:', scannerErr);
            let errorMsg = 'Kamera başlatılamadı. Lütfen kamera izinlerini kontrol edin.';
            if (scannerErr.name === 'NotAllowedError') {
              errorMsg = 'Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera izni verin.';
            } else if (scannerErr.name === 'NotFoundError') {
              errorMsg = 'Cihazda kamera bulunamadı.';
            }
            setNotification({
              type: 'error',
              message: errorMsg,
            });
            setIsQRScannerOpen(false);
            setQrAction(null);
          });
      }, 100);
    } catch (err: any) {
      console.error('Location error before scan:', err);
      setActionLoading(false);
      let msg = 'Konum izni gereklidir. Lütfen tarayıcı ayarlarından izin verin.';
      if (err.code === 3) {
        msg = 'Konum alma zaman aşımına uğradı. Lütfen GPS\'in açık olduğundan emin olun.';
      }
      setNotification({ type: 'error', message: msg });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
        <Loader2 className="animate-spin text-whatsapp-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Verileriniz hazırlanıyor...</p>
        <p className="text-xs text-slate-400 mt-2">Bu işlem internet hızınıza bağlı olarak biraz sürebilir.</p>
      </div>
    );
  }

  if (error || (!employeeData && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Bir Sorun Oluştu</h3>
        <p className="text-slate-500 mb-6">
          {error || 'Personel kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-whatsapp-600 text-white rounded-xl font-bold shadow-lg shadow-whatsapp-600/20"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Test Button Section */}
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-3xl flex flex-col gap-2">
        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest text-center">DEBUG MOD: TEST ALANI</p>
        <button
          onClick={handleTestAttendanceWrite}
          className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-transform"
        >
          TEST ATTENDANCE YAZ
        </button>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-whatsapp-500 to-whatsapp-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-whatsapp-600/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 text-white/80">
            <Clock size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">CANLI TAKİP SİSTEMİ</span>
          </div>

          <div>
            <p className="text-sm font-medium text-white/80">Hoş geldin,</p>
            <h2 className="text-3xl font-bold tracking-tight">{employeeData?.name || 'Çalışan'}</h2>
          </div>

          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">BUGÜNKÜ VARDİYA</p>
              <p className="text-2xl font-black">
                {shiftInfo?.startTime && shiftInfo?.endTime
                  ? `${shiftInfo.startTime} - ${shiftInfo.endTime}`
                  : 'Vardiya bilgisi yok'}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full animate-pulse',
                    status === 'working' ? 'bg-whatsapp-300' : 'bg-white/80'
                  )}
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  DURUM: {status === 'working' ? 'AKTİF' : status === 'break' ? 'MOLA' : 'BEKLEMEDE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">HIZLI ERİŞİM</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Calendar, label: 'İzin Al', color: 'text-blue-500', bg: 'bg-blue-50', path: '/mobile/leaves' },
            { icon: Clock, label: 'Vardiya', color: 'text-purple-500', bg: 'bg-purple-50', path: '/mobile/schedule' },
            { icon: FileText, label: 'Kayıtlar', color: 'text-orange-500', bg: 'bg-orange-50', path: '/mobile/records' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.path}
              className="flex flex-col items-center gap-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm active:scale-95 transition-transform"
            >
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', item.bg, item.color)}>
                <item.icon size={24} />
              </div>
              <span className="text-xs font-bold text-slate-600">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => startScanner('check-in')}
          disabled={status === 'working' || actionLoading}
          className={cn(
            'flex flex-col items-center gap-4 p-6 rounded-[2rem] border transition-all active:scale-95',
            status === 'working'
              ? 'bg-slate-50 border-slate-100 opacity-50 grayscale'
              : 'bg-white border-whatsapp-100 shadow-sm hover:border-whatsapp-200'
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-whatsapp-50 text-whatsapp-600 flex items-center justify-center">
            <QrCode size={32} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">Giriş Yap</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">QR OKUT</p>
          </div>
        </button>

        <button
          onClick={() => startScanner('check-out')}
          disabled={status === 'idle' || actionLoading}
          className={cn(
            'flex flex-col items-center gap-4 p-6 rounded-[2rem] border transition-all active:scale-95',
            status === 'idle'
              ? 'bg-slate-50 border-slate-100 opacity-50 grayscale'
              : 'bg-white border-red-100 shadow-sm hover:border-red-200'
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <QrCode size={32} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800">Çıkış Yap</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">QR OKUT</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="flex items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform">
          <Coffee size={20} className="text-orange-500" />
          <span className="text-sm font-bold text-slate-700">Mola Başlat</span>
        </button>
        <button className="flex items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform">
          <MapPin size={20} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-700">Konum Bildir</span>
        </button>
      </div>

      <div className="bg-whatsapp-50/50 p-5 rounded-[2rem] border border-whatsapp-100 flex gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck size={24} className="text-whatsapp-600" />
        </div>
        <p className="text-xs text-whatsapp-800 font-medium leading-relaxed">
          Giriş ve çıkış işlemleri sırasında konumunuz doğrulanmaktadır. Lütfen şube sınırları içerisinde olduğunuzdan emin olun.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">SON İŞLEMLER</h3>
          <Link to="/mobile/records" className="text-[10px] font-bold text-whatsapp-600 uppercase tracking-widest">
            TÜMÜNÜ GÖR
          </Link>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
          {recentRecords.length > 0 ? (
            recentRecords.map((record, i) => (
              <div key={record.id || i} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      record.checkOut ? 'bg-red-50 text-red-600' : 'bg-whatsapp-50 text-whatsapp-600'
                    )}
                  >
                    {record.checkOut ? <Clock size={20} /> : <QrCode size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {record.checkOut ? 'Mesai Çıkışı' : 'Mesai Girişi'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {record.createdAt?.toDate
                        ? format(record.createdAt.toDate(), 'd MMMM, HH:mm', { locale: tr })
                        : 'Az önce'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <AlertCircle size={32} className="text-slate-200" />
              </div>
              <p className="text-sm font-medium text-slate-400">Henüz işlem bulunamadı</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isQRScannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-sm space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">QR Kod Okutun</h2>
                <p className="text-white/60 text-sm">
                  {qrAction === 'check-in'
                    ? 'Giriş yapmak için şube kodunu okutun'
                    : 'Çıkış yapmak için şube kodunu okutun'}
                </p>
              </div>

              <div className="relative aspect-square bg-white/5 rounded-[3rem] overflow-hidden border-2 border-white/20">
                <div id="qr-reader" className="w-full h-full" />
                <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-whatsapp-500 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-whatsapp-500 -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-whatsapp-500 -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-whatsapp-500 -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-whatsapp-500 -mb-1 -mr-1 rounded-br-lg" />
                  </div>
                </div>
              </div>

              <button
                onClick={closeScanner}
                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[110]"
          >
            <div
              className={cn(
                'p-4 rounded-2xl shadow-2xl border flex items-center gap-3',
                notification.type === 'success'
                  ? 'bg-whatsapp-600 border-whatsapp-500 text-white'
                  : 'bg-red-600 border-red-500 text-white'
              )}
            >
              {notification.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-bold flex-1">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}