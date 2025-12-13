"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FirestoreError,
  Query,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

type UseCollectionResult<T> = {
  data: T[];
  isLoading: boolean;
  error: FirestoreError | null;
};

/**
 * Safe Firestore collection hook.
 * - queryRef null ise asla Firestore'a gitmez.
 * - Permission denied gibi hatalarda app'i çökertmek yerine error döndürür.
 */
export function useCollection<T = DocumentData>(
  queryRef: Query<DocumentData> | null
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!queryRef);
  const [error, setError] = useState<FirestoreError | null>(null);

  // query değişince loading durumunu güncelle
  useEffect(() => {
    setIsLoading(!!queryRef);
    setError(null);

    // query yoksa: boş data + loading false
    if (!queryRef) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(
      queryRef,
      (snap: QuerySnapshot<DocumentData>) => {
        // Firestore doc'lardan {id, ...data} üret
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setData(rows as unknown as T[]);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Permission denied vs: app'i göçertme, error döndür
        setError(err);
        setIsLoading(false);

        // İstersen izin hatasında datayı boşalt
        // setData([]);
      }
    );

    return () => unsub();
  }, [queryRef]);

  return useMemo(
    () => ({ data, isLoading, error }),
    [data, isLoading, error]
  );
}
