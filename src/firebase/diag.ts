
'use client';
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseConfig } from "./config";

// This function is for diagnostic purposes as requested by the user.
export async function diag() {
  console.log("--- DIAGNOSTIC TEST RUNNING ---");
  
  let app: FirebaseApp;
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Cache the app instance on the window object as requested
  (window as any).firebaseApp = app;

  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log("[CFG] projectId:", app.options.projectId);
  console.log("[CFG] authDomain:", app.options.authDomain);

  return new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AUTH] signedIn:", !!user);
      if (!user) {
        console.log("--- DIAGNOSTIC TEST FINISHED (USER NOT SIGNED IN) ---");
        unsubscribe();
        return resolve();
      }

      try {
        const token = await user.getIdTokenResult(true); // Force refresh
        console.log("[AUTH] email:", user.email);
        console.log("[AUTH] uid:", user.uid);
        console.log("[AUTH] email_verified:", token.claims.email_verified);
        console.log("[AUTH] claims:", token.claims);

        // 1: owner self doc denemesi
        try {
          const me = await getDoc(doc(db, "students", user.uid));
          console.log("[READ self] Document exists:", me.exists());
        } catch (e:any) {
          console.error("[READ self ERR]", e.code, e.message);
        }

        // 2: var olduğunu bildiğin başka bir öğrencinin doc'u (uydurma değil)
        try {
          // IMPORTANT: Replace this with a REAL student ID from your database for the test to be valid.
          const otherId = "<BURAYA_BAŞKA_STUDENT_ID>";
          if (otherId === "<BURAYA_BAŞKA_STUDENT_ID>") {
            console.warn("[READ other] SKIPPED - Please replace the placeholder ID in src/firebase/diag.ts");
          } else {
            const other = await getDoc(doc(db, "students", otherId));
            console.log("[READ other] Document exists:", other.exists());
          }
        } catch (e:any) {
          console.error("[READ other ERR]", e.code, e.message);
        }
      } catch (tokenError: any) {
        console.error("[AUTH ERR] Could not get ID token:", tokenError.message);
      } finally {
        console.log("--- DIAGNOSTIC TEST FINISHED ---");
        unsubscribe(); // Unsubscribe after running once
        resolve();
      }
    });
  });
}

    