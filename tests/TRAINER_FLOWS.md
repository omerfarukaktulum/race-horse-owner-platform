# Trainer Collaboration Test Plan

Manual regression checklist to verify the new trainer collaboration experience.

## 1. Owner – Add Trainer
1. Sign in as an owner with a completed stablemate.
2. Navigate to `/app/stablemate`.
3. Click **Antrenör Ekle**.
4. Search TJK for a trainer (e.g., “Engin”) and select a result.
5. Submit the modal.
6. **Expect:** Trainer appears in the list with status “Bekleniyor” or “Bağlandı” if the trainer already has an account.

## 2. Owner – Assign Trainers To Horses
1. Ensure at least one trainer with a linked account exists (trainer registered with matching TJK ID).
2. On `/app/stablemate`, click **Atlara Antrenör Ata**.
3. For each horse, choose an available trainer from the dropdown.
4. Save assignments.
5. **Expect:** Success toast, horses now show the selected trainer on detail pages and `/api/horses` responses.

## 3. Trainer – Navigation & Access
1. Sign in as a trainer who was added to a stablemate and assigned at least one horse.
2. Confirm navbar brand shows trainer context; account button routes to `/app/trainer/account`.
3. Visit `/app/home`, `/app/horses`, `/app/expenses`, `/app/stats`, `/app/notes`.
4. **Expect:** Pages load with data limited to the trainer’s assigned horses (verify via API logs if needed).

## 4. Trainer – Account Overview
1. Visit `/app/trainer/account`.
2. **Expect:** Summary cards show counts, stablemate cards list owner name, horses, and counts.
3. Click **Yenile** to refetch; values stay consistent.

## 5. Trainer – Notification Preferences
1. On `/app/trainer/account`, toggle each notification switch.
2. **Expect:** Immediate state change, API `PATCH /api/trainer/account` succeeds.
3. Refresh page – toggles persist previous selections.

## 6. API Spot Checks
- `GET /api/stablemate/trainers` returns newly added trainers with profile linkage.
- `POST /api/stablemate/trainers/assign` updates `horse.trainerId`.
- Dashboard endpoints (`recent-races`, `registrations`, `gallops`, `recent-expenses`) return trainer-specific data when JWT holds `role=TRAINER`.

## 7. Negative Cases
- Owner tries to assign a trainer entry without linked account → API returns validation error.
- Trainer without assigned horses sees empty states on dashboard widgets and account page.
- Trainer access to `/app/stablemate` keeps showing API error (403) and page does not break.

Document test results (pass/fail, date, tester) alongside this checklist for future releases.

