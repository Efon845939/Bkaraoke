"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, DocumentReference, DocumentData, FirestoreError } from "firebase/firestore";

export function useDoc<T = DocumentData>(
  docRef: DocumentReference<DocumentData> | null
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!docRef);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setIsLoading(!!docRef);
    setError(null);

    if (!docRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
        } else {
          setData({ id: snap.id, ...(snap.data() as any) } as any);
        }
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [docRef]);

  return useMemo(() => ({ data, isLoading, error }), [data, isLoading, error]);
}