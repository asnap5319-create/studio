
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Replace these with your actual Firebase project config
firebase.initializeApp({
  apiKey: "AIzaSyAI3biHeysO2T4am-9iqDT6_k0nO-0iKL8",
  authDomain: "studio-8111746683-c1e57.firebaseapp.com",
  projectId: "studio-8111746683-c1e57",
  storageBucket: "studio-8111746683-c1e57.appspot.com",
  messagingSenderId: "1070901483498",
  appId: "1:1070901483498:web:47c67293702a67810cc493"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
