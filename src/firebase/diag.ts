
'use client';

import { initializeApp, getApps } from "firebase/app";
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
    // doğrudan tek belge oku (koleksiyon değil)
    try {
      const snap = await getDoc(doc(db, "students", user.uid));
      console.log("[READ self]", snap.exists());
    } catch (e:any) {
      console.error("[READ self ERR]", e.code, e.message);
    }
  });
}
