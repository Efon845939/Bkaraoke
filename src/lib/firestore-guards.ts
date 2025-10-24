'use client';

import {
  CollectionReference,
  DocumentData,
  Query,
  collection,
  query,
  where,
  orderBy,
  getFirestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

export type Roles = {
  isOwner: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
};

/**
 * Builds a Firestore query for the 'song_requests' collection based on user role.
 * This is the single source of truth for this type of query.
 *
 * @param db The Firestore instance.
 * @param user The authenticated user object.
 * @param roles The roles object for the user.
 * @returns A Firestore query object.
 * @throws An error if db/user are not provided or if the user role is unknown.
 */
export function buildSongRequestsQuery(
  db: ReturnType<typeof getFirestore>,
  user: User,
  roles: Roles
): Query<DocumentData> {
  if (!db || !user) {
    // This should be caught before calling, but as a safeguard:
    throw new Error("Firestore DB or User not available for query construction.");
  }

  const col = collection(db, 'song_requests') as CollectionReference<DocumentData>;

  if (roles.isOwner || roles.isAdmin) {
    // Owner/Admin can see the full list, ordered by the manual 'order' field
    return query(col, orderBy('order', 'asc'));
  }

  if (roles.isParticipant) {
    // Participant can only see their own requests, ordered by submission date
    return query(
      col,
      where('participantId', '==', user.uid),
      orderBy('submissionDate', 'desc')
    );
  }

  // If no role matches, throw an error to prevent any data leakage.
  throw new Error("Unknown user role; cannot build song request query.");
}
