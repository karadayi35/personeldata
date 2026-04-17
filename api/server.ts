import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { Resend } from "resend";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import { format, addMinutes, parseISO, isValid } from "date-fns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Initialize using environment variables (Vercel/Production)
      const adminConfig: admin.AppOptions = {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      };

      admin.initializeApp(adminConfig);
      console.log("Firebase Admin initialized successfully using environment variables.");
      
      const dbId = process.env.FIREBASE_DATABASE_ID || "ai-studio-90f319b6-1ccf-4f41-8793-86588c46c0c6";
      console.log("Firestore Database ID configured:", dbId);
    } else {
      // Fallback to service-account.json (Local Development)
      const serviceAccountPath = path.join(process.cwd(), "service-account.json");
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin initialized successfully with service account for project:", serviceAccount.project_id);
      } else {
        console.warn("WARNING: Firebase Admin credentials not found (env vars or service-account.json). Auth features will fail.");
      }
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Route for sending emails
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        error: "RESEND_API_KEY is not set in environment variables." 
      });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: "Personel Takip Sistemi <noreply@turkishdentistconnect.com>",
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        console.error("Resend API error:", error);
        return res.status(400).json({ error: error.message || "Failed to send email via Resend." });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: "An unexpected error occurred while sending email." });
    }
  });

  // API Route for creating Firebase Auth user
  app.post("/api/create-user", async (req, res) => {
    const { email, password, displayName } = req.body;

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      res.status(200).json({ success: true, uid: userRecord.uid });
    } catch (error) {
      console.error("Auth user creation error:", error);
      let errorMessage = error instanceof Error ? error.message : "Failed to create user.";
      
      const projectId = process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID";
      if (errorMessage.includes("Identity Toolkit API")) {
        errorMessage = `Identity Toolkit API is disabled in project ${projectId}. Please enable it in the Google Cloud Console: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${projectId}`;
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route for deleting Firebase Auth user
  app.post("/api/delete-user", async (req, res) => {
    const { uid } = req.body;
    try {
      await admin.auth().deleteUser(uid);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Auth user deletion error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete user." });
    }
  });

  // API Route for updating Firebase Auth user status
  app.post("/api/update-user-status", async (req, res) => {
    const { uid, disabled } = req.body;
    try {
      await admin.auth().updateUser(uid, { disabled });
      await admin.auth().revokeRefreshTokens(uid);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Auth user status update error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update user status." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler to ensure JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler caught:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err instanceof Error ? err.message : String(err) 
    });
  });

  // Background Notification Task
  const startNotificationJob = () => {
    console.log("Starting notification background job...");
    setInterval(async () => {
      try {
        await checkAndSendShiftReminders();
      } catch (err) {
        console.error("Shift reminder job failed:", err);
      }
    }, 60000); // Her dakika çalışır
  };

  /**
   * Bildirim Gönderme Mantığı
   */
  async function checkAndSendShiftReminders() {
    const dbId = process.env.FIREBASE_DATABASE_ID || "ai-studio-90f319b6-1ccf-4f41-8793-86588c46c0c6";
    const db = admin.firestore(); // Default assumes correct DB in this environment
    
    // 1. Ayarları Getir
    const settingsDoc = await db.collection('settings').doc('global').get();
    const globalSettings = settingsDoc.exists ? settingsDoc.data() : {};
    
    // Merge default notification settings if specifically needed or just use values from global
    const settings = {
      notificationEnabled: globalSettings?.shiftReminder?.enabled ?? true,
      reminderMinutesBefore: globalSettings?.shiftReminder?.minutesBefore ?? 5,
      reminderMessage: globalSettings?.shiftReminder?.message ?? "Lütfen işe giriş yapın. Vardiyanız {minutes} dakika sonra başlıyor."
    };

    if (!settings.notificationEnabled) return;

    const now = new Date();
    // Türkiye saati veya sistem saati (UTC+3)
    // Bu sistemde UTC dönüyor olabilir, format'a dikkat
    const todayStr = format(now, "yyyy-MM-dd");
    const currentTimeStr = format(now, "HH:mm");
    
    // Hatırlatma yapılacak zamanı hesapla (5 dk sonra başlayacak olanlar)
    const reminderTarget = addMinutes(now, settings.reminderMinutesBefore);
    const targetTimeStr = format(reminderTarget, "HH:mm");
    const dayOfWeek = now.getDay();

    // 2. Aktif personelleri getir
    const employeesSnap = await db.collection('employees')
      .where('status', '==', 'active')
      .where('notificationsEnabled', '!=', false)
      .get();

    for (const empDoc of employeesSnap.docs) {
      const employee = { id: empDoc.id, ...empDoc.data() } as any;
      if (!employee.fcmToken) continue;

      // 3. Bugünün vardiyasını bul
      let shiftStart: string | null = null;
      
      // Önce Override kontrolü
      const overrideSnap = await db.collection('shift_overrides')
        .where('employeeId', '==', employee.id)
        .where('date', '==', todayStr)
        .limit(1)
        .get();

      if (!overrideSnap.empty) {
        const override = overrideSnap.docs[0].data();
        if (override.overrideType === 'day_off') continue;
        shiftStart = override.customStartTime || null;
      }

      // Eğer override yoksa atamaya bak
      if (!shiftStart) {
        const assignmentsSnap = await db.collection('employee_shift_assignments')
          .where('employeeId', '==', employee.id)
          .where('isActive', '==', true)
          .get();

        for (const assDoc of assignmentsSnap.docs) {
          const ass = assDoc.data();
          if (ass.startDate <= todayStr && (!ass.endDate || ass.endDate >= todayStr)) {
            if (ass.activeDays && ass.activeDays.includes(dayOfWeek)) {
              // Vardiya şablonunu getir
              const shiftDoc = await db.collection('shifts').doc(ass.shiftId).get();
              if (shiftDoc.exists) {
                shiftStart = shiftDoc.data()?.startTime || null;
              }
            }
          }
        }
      }

      // 4. Zaman kontrolü
      if (shiftStart === targetTimeStr) {
        // Zaten gönderildi mi?
        const logId = `${employee.id}_${todayStr}_${shiftStart}`;
        const logDoc = await db.collection('notification_logs').doc(logId).get();

        if (!logDoc.exists) {
          // Bildirim Gönder
          console.log(`Sending reminder to ${employee.name} for shift at ${shiftStart}`);
          
          const message = settings.reminderMessage.replace("{minutes}", String(settings.reminderMinutesBefore));
          
          try {
            await admin.messaging().send({
              token: employee.fcmToken,
              notification: {
                title: "Vardiya Hatırlatma",
                body: message
              },
              data: {
                url: "/mobile"
              }
            });

            // Logla
            await db.collection('notification_logs').doc(logId).set({
              employeeId: employee.id,
              date: todayStr,
              shiftStartTime: shiftStart,
              type: 'shift_reminder',
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              status: 'sent'
            });

            // Ayrıca Notification koleksiyonuna yaz (UI'da görünmesi için)
            await db.collection('notifications').add({
              userId: employee.authUid,
              title: "Vardiya Hatırlatma",
              body: message,
              type: "shift_reminder",
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

          } catch (fcmError) {
            console.error(`FCM Error for ${employee.name}:`, fcmError);
          }
        }
      }
    }
  }

  // Only listen if not on Vercel (Vercel handles the serverless execution)
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      startNotificationJob(); // Start the cron job
    });
  }

  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
