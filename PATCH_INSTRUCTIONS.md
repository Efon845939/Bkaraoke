# BKaraoke – Owner Toast Bildirimi (Ücretsiz, plansız)

Bu patch **mail göndermez** (mail için server gerekir). Ama **owner panel açıkken** yeni istek gelince ekranda toast çıkar.

## Ne yapar?
- `song_requests` koleksiyonunu zaten dinliyorsun.
- Owner girişliyken en yeni isteği yakalar.
- Daha önce gösterilmediyse toast gösterir.
- Tekrar spam yapmasın diye `localStorage` ile son gösterileni tutar.

## Kurulum (adım adım)
1) ZIP'i proje köküne aç.
   Eklenen dosya: `src/lib/owner-toast-notify.ts`

2) `src/app/admin/page.tsx` dosyasında:
   - Import ekle:
     ```ts
     import { useOwnerSongRequestToast } from "@/lib/owner-toast-notify";
     ```

   - `AdminPanel` içinde `songs` ve `toast` hazır olduktan sonra şunu ekle:
     ```ts
     useOwnerSongRequestToast({ role, songs, toast });
     ```

3) Test:
   ```bash
   npm run dev
   ```

4) Deploy:
   ```bash
   git add .
   git commit -m "feat: owner toast notifications for new song requests"
   git push
   ```

## Not
- Bu yöntem tamamen ücretsizdir, Firebase Functions / Blaze gerekmez.
- Panel kapalıysa bildirim gelmez.
