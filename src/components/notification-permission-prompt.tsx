'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Sparkles, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useFirebase, useUser } from '@/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export function NotificationPermissionPrompt() {
  const { user } = useUser();
  const { messaging, firestore } = useFirebase();
  const [isVisible, setIsVisible] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPermissionStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== 'granted') {
          setIsVisible(true);
        }
      } else {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission !== 'granted') {
            setIsVisible(true);
          }
        }
      }
    };

    // Small delay to let the app load first
    const timer = setTimeout(checkPermissionStatus, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleRequestPermission = async () => {
    if (!user || !firestore) return;
    setIsAsking(true);

    try {
      if (Capacitor.isNativePlatform()) {
        // Native Permission Request
        let permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          // The 'registration' listener in useFCM will handle saving the token
          setIsVisible(false);
        }
      } else if (messaging) {
        // Web Permission Request
        const status = await Notification.requestPermission();
        if (status === 'granted') {
          const token = await getToken(messaging, {
            vapidKey: 'BIsy80z_I2uC-p9N5T_M4E-V5J9XvW-L6R-Q8Q-P-O-S-H-I-K-E-R' // Match with useFCM
          });

          if (token) {
            await updateDoc(doc(firestore, 'users', user.uid), {
              fcmToken: token,
              updatedAt: new Date()
            });
          }
          setIsVisible(false);
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700 max-w-lg mx-auto">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 p-6 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl relative overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-inner">
               <Bell className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1">
               <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
               <h4 className="text-base font-black text-white uppercase italic tracking-tighter">Stay Connected</h4>
               <button onClick={() => setIsVisible(false)} className="p-1 text-muted-foreground hover:text-white transition-colors">
                  <X size={20} />
               </button>
            </div>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               Don't miss out! Turn on notifications to get instant alerts for <span className="text-white font-bold">New Messages</span> and <span className="text-white font-bold">Likes</span>.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
            <Button 
                onClick={handleRequestPermission} 
                disabled={isAsking}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs rounded-2xl shadow-[0_10px_25px_rgba(255,51,102,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
                {isAsking ? "Setting up..." : "Enable Notifications"}
            </Button>
            
            <div className="flex items-center justify-center gap-2 pt-1 opacity-40">
               <ShieldCheck size={12} className="text-primary" />
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Encrypted & Secure Cloud Alerts</span>
            </div>
        </div>
      </div>
    </div>
  );
}
