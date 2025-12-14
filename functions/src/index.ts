import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

/**
 * song_requests içine yeni kayıt gelince owner'a notification yazar.
 */
export const notifyOwnerOnSongRequest = onDocumentCreated(
  "song_requests/{requestId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as any;

    const studentName = (data.studentName ?? "Biri").toString();
    const songTitle = (data.songTitle ?? "Bilinmeyen Şarkı").toString();

    const message = `${studentName} — ${songTitle} isteği gönderdi`;

    await getFirestore().collection("notifications").add({
      to: "owner",
      type: "new_song_request",
      message,
      requestId: snap.id,
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });
  }
);
