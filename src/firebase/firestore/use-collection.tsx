"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, Query, DocumentData, FirestoreError } from "firebase/firestore";

export function useCollection<T = DocumentData>(
  queryRef: Query<DocumentData> | null
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!queryRef);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setIsLoading(!!queryRef);
    setError(null);

    if (!queryRef) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(
      queryRef,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setData(rows as T[]);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [queryRef]);

  return useMemo(() => ({ data, isLoading, error }), [data, isLoading, error]);
}