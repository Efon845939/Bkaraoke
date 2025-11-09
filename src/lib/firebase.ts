
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

export const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
});

if (typeof window !== "undefined") {
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("App Check initialized");
  } catch (e) {
    console.error("Failed to initialize App Check", e);
  }
}

export const db = getFirestore(app);
