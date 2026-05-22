
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';
import { useRouter } from 'next/navigation';

export function useFCM() {
  const { messaging, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!user || !firestore || hasRegisteredRef.current) return;

    const setupNotifications = async () => {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }

        // Listener for registration success
        const addRegListener = await PushNotifications.addListener('registration', async (token) => {
          console.log('Native Push registration success, token: ' + token.value);
          try {
            await updateDoc(doc(firestore, 'users', user.uid), {
              fcmToken: token.value,
              updatedAt: serverTimestamp()
            });
            hasRegisteredRef.current = true;
          } catch (e) {
            console.error('Error updating fcmToken in firestore:', e);
          }
        });

        // Listener for registration error
        const addRegErrorListener = await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listener for incoming notifications
        const addReceivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Native notification received in foreground: ', notification);
          toast({
            title: notification.title || 'New Notification',
            description: notification.body || 'Open the app to see more',
          });
        });

        // Listener for notification action performed (clicked)
        const addActionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Native notification action performed: ', action);
          const data = action.notification.data;
          if (data && data.chatId) {
             router.push(`/messages/${data.chatId}`);
          } else {
             router.push('/notifications');
          }
        });

        return () => {
          addRegListener.remove();
          addRegErrorListener.remove();
          addReceivedListener.remove();
          addActionListener.remove();
        };

      } else if (messaging) {
        // Web FCM Setup
        try {
          if (Notification.permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: 'BIsy80z_I2uC-p9N5T_M4E-V5J9XvW-L6R-Q8Q-P-O-S-H-I-K-E-R' 
            });

            if (token) {
              await updateDoc(doc(firestore, 'users', user.uid), {
                fcmToken: token,
                updatedAt: serverTimestamp()
              });
              hasRegisteredRef.current = true;
            }
          }

          onMessage(messaging, (payload) => {
            console.log('Foreground web message received: ', payload);
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
  }, [user, firestore, messaging, toast, router]);
}
