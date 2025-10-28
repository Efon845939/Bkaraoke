
'use client';

import * as React from 'react';

const FirebaseContext = React.createContext<undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    // Top-level provider for Firebase services.
    // This could be extended to include Auth, Storage, etc.
    return (
        <FirebaseContext.Provider value={undefined}>
            {children}
        </FirebaseContext.Provider>
    );
}
