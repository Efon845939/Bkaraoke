
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);
    
    // In a real production app, you would not connect to emulators.
    // But for local development and testing, this is standard.
    if (process.env.NODE_ENV === 'development') {
        // Point to the emulators.
        // Ensure you have the Firebase emulators running.
        // connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        // connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    }


    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  if (process.env.NODE_ENV === 'development') {
    try {
        // connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        // connectFirestoreEmulator(firestore, 'localhost', 8080);
    } catch (e) {
        // console.warn("Could not connect to emulators, this is expected in production", e)
    }
  }


  return {
    firebaseApp,
    auth,
    firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
// remove non-blocking login as we will now use standard email/password
// export * from './non-blocking-login'; 
export * from './errors';
export * from './error-emitter';
