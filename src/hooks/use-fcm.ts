
'use client';

import { useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

export function useFCM() {
  const { messaging, firestore, auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !firestore) return;

    const setupNotifications = async () => {
      if (Capacitor.isNativePlatform()) {
        // Native Push Setup (Android/iOS)
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission denied on native');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          await updateDoc(doc(firestore, 'users', user.uid), {
            fcmToken: token.value,
            updatedAt: new Date()
          });
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast({
            title: notification.title || 'New Message',
            description: notification.body || 'You have a new notification',
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
          // Logic to navigate can be added here
        });

      } else if (messaging) {
        // Web FCM Setup
        try {
          const status = await Notification.requestPermission();
          if (status === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: 'BIsy80z_I2uC-p9N5T_M4E-V5J9XvW-L6R-Q8Q-P-O-S-H-I-K-E-R' // Replace with your real VAPID key from Firebase Console
            });

            if (token) {
              await updateDoc(doc(firestore, 'users', user.uid), {
                fcmToken: token,
                updatedAt: new Date()
              });
            }
          }

          onMessage(messaging, (payload) => {
            console.log('Foreground message received: ', payload);
            toast({
              title: payload.notification?.title || 'New Message',
              description: payload.notification?.body || 'Check your inbox',
            });
          });
        } catch (error) {
          console.error('Error setting up Web FCM:', error);
        }
      }
    };

    setupNotifications();
  }, [user, firestore, messaging, toast]);
}
