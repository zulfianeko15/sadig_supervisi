# SADIG Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Baseline:** All paths default to `allow read, write: if false;`.
2. **Verified Identity Required:** All read/write access requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **No Self-Assigned Privileged Roles:** When creating `/users/{userId}`, non-admin users may only create their profile with `role == 'Guru'` and `uid == request.auth.uid`. Only a verified admin may assign `Admin`, `Kepala Sekolah`, `Pengawas Sekolah`, or `Pengawas Supervisi`.
4. **Master Gate on Supervision Scoring:** Writing `/penilaian/{penilaianId}` or `/catatanTahap/{catatanId}` requires `exists()` and `get()` verification that the parent `/guru/{guruId}` document exists AND has `statusBerkas == 'Disetujui'` (unless overridden by `isAdmin()`).
5. **Teacher Drive Upload Isolation:** A teacher updating `/guru/{guruId}` (matched by `guruEmail == request.auth.token.email`) may ONLY modify `['linkDriveBerkas', 'statusBerkas', 'kelengkapanBerkas', 'updatedAt']`, and cannot self-approve (`incoming().statusBerkas == 'Belum Dicek'`, `incoming().kelengkapanBerkas == 'Belum Ada'`).
6. **Temporal & Ownership Integrity:** Every document enforces `createdAt == request.time` on create, `updatedAt == request.time` on create/update, and immutable `ownerUid` and `createdAt` on update.
7. **Strict String & ID Bounds:** All document IDs match `^[a-zA-Z0-9_\\-]+$` (max 128 chars), and every string property has explicit `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write:** Attempt `getDoc(/guru/G001)` or `setDoc(/guru/G999)` with `auth == null`. -> **DENIED**.
2. **Unverified Email Spoof:** Authenticated user with `email: 'zulfianputra77@admin.smp.belajar.id'` and `email_verified: false` attempts write to `/pengaturan/sekolah`. -> **DENIED**.
3. **Privilege Escalation on Signup:** Non-admin user creates `/users/{uid}` with `role: 'Admin'`. -> **DENIED**.
4. **Profile Role Self-Update:** Non-admin user updates `/users/{uid}` changing `role` from `'Guru'` to `'Kepala Sekolah'`. -> **DENIED**.
5. **Shadow Field Injection:** User sends `{ ..., isVerified: true }` on `/guru/G001` create or update. -> **DENIED** via `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`.
6. **ID Poisoning (1.5KB Document ID):** Attempt `setDoc(/guru/<1500 chars>, ...)` or ID containing `$` / spaces. -> **DENIED** via `isValidId()`.
7. **Teacher Self-Approval Bypass:** Teacher updates `/guru/G001` setting `statusBerkas: 'Disetujui'`. -> **DENIED** via action `affectedKeys()` + status gate.
8. **Assessment Before Kepala Sekolah Approval (Master Gate):** Non-admin supervisor attempts `setDoc(/penilaian/...)` referencing a `/guru/{guruId}` whose `statusBerkas == 'Belum Dicek'`. -> **DENIED** via `get(...).data.statusBerkas == 'Disetujui'`.
9. **Orphan Assessment Record:** Attempt `setDoc(/penilaian/...)` with non-existent `guruId`. -> **DENIED** via `exists(...)`.
10. **Client Timestamp Forgery:** Send `updatedAt: Timestamp(2020-01-01)` instead of `serverTimestamp()`. -> **DENIED** via `incoming().updatedAt == request.time`.
11. **PII Listing Scrape:** Non-admin user executes `getDocs(collection(db, 'users'))`. -> **DENIED** because `allow list` restricts to `resource.data.uid == request.auth.uid || isBootstrappedAdmin()`.
12. **Out-of-Range Score / Massive String DoW:** Send `skor: 99` or a 2MB string in `aspek`. -> **DENIED** via numeric range check (`skor in [1, 2, 3, 4]`) and `.size()` bounds.
