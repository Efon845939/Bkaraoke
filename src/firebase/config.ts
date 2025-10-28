
// Follow this pattern to import other Firebase services
// import { getAuth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';

import { getApps, initializeApp } from 'firebase/app';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// It's recommended to export the initialized services
// for example:
// const auth = getAuth(app);
// const firestore = getFirestore(app);

// export { app, auth, firestore };
export { app };
