
'use client';
import { app } from './config';
import { getFirestore, Firestore } from 'firebase/firestore';
import React from 'react';

let firestore: Firestore;

export const useFirestore = () => {
    if (!firestore) {
        firestore = getFirestore(app);
    }
    return firestore;
}
