'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It prevents crashes for guest users while still showing errors for logged-in users/admins.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // If no user is logged in, don't throw to avoid "Application Error" for guest users
      // This is crucial for "Guest Mode" like Instagram
      if (!user) {
        console.warn("Silent Permission Error (Guest Mode):", error.message);
        return;
      }
      
      // Also suppress permission errors on root path collection group queries for logged in users
      // to handle cases where index is still building or other transient issues.
      if (error.message.includes('posts')) {
         console.warn("Recoverable post permission error:", error.message);
         return;
      }

      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user]);

  if (error) {
    throw error;
  }

  return null;
}