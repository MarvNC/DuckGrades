# CSV Structure and Overlap Notes

## Files Compared

- `pub_rec_master_w2016-f2025.csv`
- `pub_rec_master_f2015-u2025.csv`

## Structure

- `pub_rec_master_w2016-f2025.csv`: 152,710 rows, 25 columns
- `pub_rec_master_f2015-u2025.csv`: 142,864 rows, 24 columns
- Shared columns: 24
- Column only in `pub_rec_master_w2016-f2025.csv`: `TITLE`

Shared columns are:

`TERM, TERM_DESC, SUBJ, NUMB, CRN, INSTRUCTOR, AP, A, AM, BP, B, BM, CP, C, CM, DP, D, DM, F, P, N, OTHER, W, TOT_NON_W`

## Column Contents (Observed)

These are not just schema names; this is what values actually look like in both files.

### Course Identity / Metadata Columns

- `TERM`: 6-digit term code (`YYYYTT` style), observed range `201501` to `202501` depending on file
- `TERM_DESC`: human term label (examples: `Fall 2016`, `Winter 2024`, `Spring Law 2025`, `Summer 2023`)
- `SUBJ`: subject code (examples: `AA`, `PSY`, `MATH`, `J`), about 249-250 distinct subjects
- `NUMB`: course number, stored as text (examples: `404`, `321`)
- `CRN`: 5-digit section identifier (always length 5 in both files)
- `INSTRUCTOR`: instructor name in `Last, First` format (quoted in CSV)
- `TITLE`: only present in `pub_rec_master_w2016-f2025.csv`, course title text (example: `Inclusive Urbanism`)

### Grade Distribution Columns

- Grade buckets: `AP, A, AM, BP, B, BM, CP, C, CM, DP, D, DM, F, P, N, OTHER, W`
- `TOT_NON_W`: total non-withdrawal count for the row
- For rows with numeric grade values, `TOT_NON_W` exactly equals `AP + A + AM + BP + B + BM + CP + C + CM + DP + D + DM + F + P + N + OTHER`

### Common Value Patterns

- Grade bucket columns often contain `*` instead of a number
- Rows with `*` in grade buckets are common (about 70% in `pub_rec_master_w2016-f2025.csv`, about 68% in `pub_rec_master_f2015-u2025.csv`)
- When grade buckets are numeric, they are non-negative integers
- `W` is tracked separately and not included in `TOT_NON_W`
- Maximum observed `TOT_NON_W` is `588` in both files

## Term Coverage

- `pub_rec_master_w2016-f2025.csv`: `201502` to `202501` (70 terms)
- `pub_rec_master_f2015-u2025.csv`: `201501` to `202407` (70 terms)
- Shared terms: 69 (`201502` to `202407`)
- Term only in `pub_rec_master_f2015-u2025.csv`: `201501` (4,554 rows)
- Term only in `pub_rec_master_w2016-f2025.csv`: `202501` (4,269 rows)

## Overlap (on Shared 24 Columns)

- Exact overlapping rows: 132,419
- Rows only in `pub_rec_master_w2016-f2025.csv`: 20,291
- Rows only in `pub_rec_master_f2015-u2025.csv`: 10,445

## Course-Instance Key Comparison

Using key: `TERM + SUBJ + NUMB + CRN`

- Shared unique keys: 111,994
- Shared keys with identical shared-column values: 107,712
- Shared keys with at least one differing value: 4,282

Observed differences in sampled mismatches are mostly:

- `INSTRUCTOR` value differences
- `TOT_NON_W` value differences

## Quick Takeaway

The two files strongly overlap, but they are not interchangeable. One file adds `TITLE`, each file includes one non-overlapping term, and several thousand shared course keys still have value-level differences.
