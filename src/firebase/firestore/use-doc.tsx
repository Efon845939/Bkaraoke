"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DocumentData,
  DocumentReference,
  FirestoreError,
  DocumentSnapshot,
} from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

type UseDocResult<T> = {
  data: (T & { id: string }) | null;
  isLoading: boolean;
  error: FirestoreError | null;
};

/**
 * Safe Firestore doc hook.
 * - docRef null ise Firestore'a gitmez.
 * - Permission denied gibi hatalarda app'i çökertmez.
 */
export function useDoc<T = DocumentData>(
  docRef: DocumentReference<DocumentData> | null
): UseDocResult<T> {
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
      (snap: DocumentSnapshot<DocumentData>) => {
        if (!snap.exists()) {
          setData(null);
        } else {
          setData({ id: snap.id, ...(snap.data() as any) } as T & { id: string });
        }
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [docRef]);

  return useMemo(
    () => ({ data, isLoading, error }),
    [data, isLoading, error]
  );
}
