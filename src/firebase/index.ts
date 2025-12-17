'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Vercel gibi ortamlarda Firebase App Hosting auto-init YOK.
// O yüzden default: config ile init.
// Eğer gerçekten Firebase App Hosting'te çalıştırıyorsan bunu "true" yapacak env koy.
const USE_APP_HOSTING_AUTOINIT =
  process.env.NEXT_PUBLIC_USE_FIREBASE_APP_HOSTING_AUTOINIT === 'true';

function assertConfigLooksValid() {
  // firebaseConfig içindeki kritik alanlar boşsa fallback da işe yaramaz.
  // Burada patlatıyoruz ki "no-options" yerine gerçek sebebi görelim.
  const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId',
  ];

  for (const k of requiredKeys) {
    const v = firebaseConfig?.[k];
    if (!v || String(v).trim() === '') {
      throw new Error(
        `Firebase config missing: ${k}. Vercel Environment Variables'larını kontrol et (NEXT_PUBLIC_FIREBASE_*)`
      );
    }
  }
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION (senin eski yorumun vardı ama burada mecburen düzelttik)
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;

    // 1) Sadece gerçekten Firebase App Hosting ise autoinit dene
    if (USE_APP_HOSTING_AUTOINIT) {
      try {
        firebaseApp = initializeApp(); // App Hosting'te çalışır
        return getSdks(firebaseApp);
      } catch (e) {
        console.warn(
          'Firebase App Hosting autoinit failed, falling back to firebaseConfig.',
          e
        );
        // devam: config init
      }
    }

    // 2) Vercel/normal durumda her zaman config ile init
    assertConfigLooksValid();
    firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
