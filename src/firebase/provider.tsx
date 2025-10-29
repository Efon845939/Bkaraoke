
'use client';

import { app } from '@/firebase/config';
import { Firestore, getFirestore } from 'firebase/firestore';
import * as React from 'react';

// Bu bağlam (context) Firestore örneğini saklayacak.
const FirebaseContext = React.createContext<Firestore | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    // Firestore örneğini sadece bir kez oluşturup saklıyoruz.
    const [firestoreInstance] = React.useState(() => getFirestore(app));

    return (
        <FirebaseContext.Provider value={firestoreInstance}>
            {children}
        </FirebaseContext.Provider>
    );
}

// Bu özel kanca (hook), bileşenlerin Firestore örneğine erişmesini sağlar.
export const useFirestore = () => {
    const context = React.useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirestore must be used within a FirebaseProvider');
    }
    return context;
};
