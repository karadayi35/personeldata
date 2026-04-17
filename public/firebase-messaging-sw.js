// Scripts for firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBn-zeDrWscwqWw5oz6dp2RL2W_ztdKt5Y",
  authDomain: "leadfinderpro-483309.firebaseapp.com",
  projectId: "leadfinderpro-483309",
  storageBucket: "leadfinderpro-483309.firebasestorage.app",
  messagingSenderId: "365884351342",
  appId: "1:365884351342:web:d39937c1fc20790143d77f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
