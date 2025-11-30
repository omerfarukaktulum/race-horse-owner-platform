# Demo Data Generation Summary

This document outlines how many data items are generated for each part in the demo data generation script (`scripts/create-demo-data.ts`).

## Data Generation Quantities

### 1. **Expenses (Giderler)**

#### Horse-Specific Expenses
- **Quantity**: 3-5 expenses per horse
- **Categories**: Only horse-required categories
  - `ILAC` (İlaç ve tedavi masrafları)
  - `MONT` (Mont giderleri)
  - `NAKLIYE` (Nakliye ve taşıma giderleri)
- **Total per horse**: 3-5 expenses
- **Example**: If you have 5 horses, you'll get 15-25 horse-specific expenses

#### Stablemate-Level Expenses
- **Quantity**: 2-3 expenses per category
- **Categories**: All other categories (8 categories total)
  - `IDMAN_JOKEYI` (İdman jokeyi ücreti)
  - `SEYIS` (Seyis ücreti)
  - `YEM_SAMAN_OT_TALAS` (Yem, saman, ot ve talaş giderleri)
  - `YARIS_KAYIT_DECLARE` (Yarış kayıt ve deklare ücreti)
  - `SEZONLUK_AHIR` (Sezonluk ahır kirası)
  - `SIGORTA` (Sigorta giderleri)
  - `NAL_NALBANT` (Nal ve nalbant giderleri)
  - `SARAC` (Saraç giderleri)
- **Total**: 8 categories × 2-3 = **16-24 stablemate-level expenses**
- **Note**: These expenses have `horseId = NULL` (not assigned to a specific horse)

**Total Expenses**: (3-5 per horse × number of horses) + 16-24 stablemate expenses

---

### 2. **Notes (Notlar)**

- **Quantity**: 5-7 notes per horse
- **Total**: 5-7 × number of horses
- **Example**: If you have 5 horses, you'll get 25-35 notes

---

### 3. **Illnesses (Hastalıklar)**

- **Quantity**: 0-1 illness per horse
- **Probability**: 50% chance per horse (if `Math.random() > 0.5`)
- **Guarantee**: At least 1 horse will definitely have an illness (randomly selected)
- **Average**: ~0.5+ illnesses per horse (depending on random generation)
- **Operations**: If an illness is resolved (not ongoing), there's a 50% chance it will have 1-2 operations
- **Total**: At least 1 horse, plus approximately 50% of remaining horses will have 1 illness each

---

### 4. **Banned Medicines (Yasaklı İlaçlar)**

- **Quantity**: 0-1 banned medicine per horse
- **Probability**: 40% chance per horse (if `Math.random() > 0.6`)
- **Guarantee**: At least 1 horse will definitely have a banned medicine (same horse that has an illness)
- **Average**: ~0.4+ banned medicines per horse (depending on random generation)
- **Total**: At least 1 horse (the same one with illness), plus approximately 40% of remaining horses will have 1 banned medicine each

**Important**: At least 1 horse is guaranteed to have both an illness and a banned medicine.

---

### 5. **Training Plans (Antrenman Planları)**

- **Quantity**: 1-3 training plans per horse
- **Total**: 1-3 × number of horses
- **Note**: Training plans are for future dates (1-14 days ahead)
- **Example**: If you have 5 horses, you'll get 5-15 training plans

---

## Example Calculation

For a user with **5 horses**:

| Data Type | Quantity Range | Average |
|-----------|---------------|---------|
| **Horse-Specific Expenses** | 15-25 | 20 |
| **Stablemate-Level Expenses** | 16-24 | 20 |
| **Total Expenses** | 31-49 | 40 |
| **Notes** | 25-35 | 30 |
| **Illnesses** | 1-5 | ~3 |
| **Illness Operations** | 0-5 | ~1.5 |
| **Banned Medicines** | 1-5 | ~2.5 |
| **Training Plans** | 5-15 | 10 |

**Total SQL Statements**: Approximately 50-80+ (depending on random generation)

---

## Notes

- All dates are randomized within the past 30 days (except training plans which are future dates)
- Amounts for expenses are randomized between 500-5500 TRY
- The script generates SQL statements that can be executed directly against the database
- All data is generated for the user specified in `USER_EMAIL` constant

