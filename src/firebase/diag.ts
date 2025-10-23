
'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "./config";

export function diag() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log("[CFG] projectId:", app.options.projectId);
  console.log("[CFG] authDomain:", app.options.authDomain);

  onAuthStateChanged(auth, async (user) => {
    console.log("[AUTH] user?", !!user, "email:", user?.email, "uid:", user?.uid);
    if (!user) return;
    
    try {
      const token = await user.getIdTokenResult(true);
      console.log("[AUTH] email_verified:", token.claims.email_verified);
      console.log("[AUTH] claims:", token.claims);
    } catch (e: any) {
       console.error("[TOKEN ERR]", e.code, e.message);
    }

    try {
      const snap = await getDoc(doc(db, "students", user.uid));
      console.log("[READ self]", snap.exists());
    } catch (e:any) {
      console.error("[READ self ERR]", e.code, e.message);
    }
  });
}
