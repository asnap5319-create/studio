
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Sparkles, ShieldCheck, Loader2, MessageCircle, Heart, UserPlus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useFirebase, useUser } from '@/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export function NotificationPermissionPrompt() {
  const { user } = useUser();
  const { messaging, firestore } = useFirebase();
  const [isVisible, setIsVisible] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPermissionStatus = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            setIsVisible(true);
          }
        } else {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
              setIsVisible(true);
            }
          }
        }
      } catch (err) {
        console.error("Error checking permissions:", err);
      }
    };

    const timer = setTimeout(checkPermissionStatus, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleRequestPermission = async () => {
    if (!user || !firestore) return;
    setIsAsking(true);

    try {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          setIsVisible(false);
        } else {
          setIsVisible(false);
        }
      } else {
        if (!('Notification' in window)) {
           setIsVisible(false);
           return;
        }

        const status = await Notification.requestPermission();
        if (status === 'granted') {
          if (messaging) {
            try {
              const token = await getToken(messaging, {
                vapidKey: 'BIsy80z_I2uC-p9N5T_M4E-V5J9XvW-L6R-Q8Q-P-O-S-H-I-K-E-R' 
              });

              if (token) {
                await updateDoc(doc(firestore, 'users', user.uid), {
                  fcmToken: token,
                  updatedAt: serverTimestamp()
                });
              }
            } catch (tokenErr) {
              console.error("Token retrieval failed:", tokenErr);
            }
          }
          setIsVisible(false);
        } else {
           setIsVisible(false);
        }
      }
    } catch (error) {
      console.error('Real permission request failed:', error);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 p-4">
      <div className="w-full max-w-sm bg-background border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full duration-700">
        {/* Instagram style Header */}
        <div className="p-8 pb-0 text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
             <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
             <div className="relative w-full h-full bg-money-pattern rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl rotate-3">
                <Bell className="w-12 h-12 text-primary" />
                <div className="absolute -top-2 -right-2">
                   <Sparkles className="h-6 w-6 text-yellow-400" />
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase">Turn on Alerts?</h4>
             <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                Stay updated when someone messages you, likes your reels, or starts following you.
             </p>
          </div>
        </div>

        {/* Action Items List */}
        <div className="px-8 py-6 space-y-4">
            <div className="flex items-center gap-4 bg-secondary/30 p-3 rounded-2xl border border-white/5">
               <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400"><MessageCircle size={20} /></div>
               <span className="text-xs font-bold uppercase tracking-widest text-white/90">Instant Messages</span>
            </div>
            <div className="flex items-center gap-4 bg-secondary/30 p-3 rounded-2xl border border-white/5">
               <div className="h-10 w-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-400"><Heart size={20} /></div>
               <span className="text-xs font-bold uppercase tracking-widest text-white/90">Likes & Comments</span>
            </div>
            <div className="flex items-center gap-4 bg-secondary/30 p-3 rounded-2xl border border-white/5">
               <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400"><UserPlus size={20} /></div>
               <span className="text-xs font-bold uppercase tracking-widest text-white/90">New Followers</span>
            </div>
        </div>

        {/* Buttons */}
        <div className="p-8 pt-2 flex flex-col gap-3">
            <Button 
                onClick={handleRequestPermission} 
                disabled={isAsking}
                className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-sm rounded-2xl shadow-[0_15px_30px_rgba(255,51,102,0.3)] transition-all active:scale-95"
            >
                {isAsking ? (
                   <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Opening System...</span>
                   </div>
                ) : (
                  "Allow Access"
                )}
            </Button>
            
            <button 
                onClick={() => setIsVisible(false)}
                className="w-full h-12 text-muted-foreground hover:text-white font-black uppercase text-[10px] tracking-[0.2em] transition-colors"
            >
                Not Now
            </button>
            
            <div className="flex items-center justify-center gap-2 pt-2 opacity-30">
               <ShieldCheck size={12} className="text-primary" />
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Verified Secure System Request</span>
            </div>
        </div>
      </div>
    </div>
  );
}
