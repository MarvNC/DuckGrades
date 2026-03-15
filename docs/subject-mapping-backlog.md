# Subject Mapping Backlog

Last updated: 2026-03-15

## Current policy

- Merge only high-confidence legacy subject-code renames.
- Do **not** merge `O***` study-abroad bucket subjects into canonical departments.
- Keep original section-level source course IDs/titles in drilldown rows.

## Already merged (high confidence)

- `CIS -> CS`
- `J -> JCOM`
- `JC -> JCOM`
- `GEOL -> ERTH`
- `INTL -> GLBL`
- `AEII -> AEIS`
- `AEIP -> AEIS`
- `AEGP -> AEIS`
- `AA -> AAA`

### Course-level aliases

- `WR-121 -> WR-121Z`
- `WR-122 -> WR-122Z`
- `MATH-105 -> MATH-105Z`
- `MATH-111 -> MATH-111Z`
- `MATH-112 -> MATH-112Z`
- `MATH-243 -> STAT-243Z`

## Accounted for without merge (non-O)

- `AAD` (title override: Arts and Administration)
- `SAPP` (title override: Substance Abuse Prevention Program)
- `TLC` (title override: Teaching and Learning Center)
- `AIM` (title override: Applied Information Management)
- `AAA` (title override: Arts and Administration)
- `FIG` (title override: First-Year Interest Group)

## Unmerged study-abroad bucket codes (`O***`)

- Count: 96 codes (intentionally unmerged)
- Highest-volume examples:
  - `OCIE` (1103 sections)
  - `OWAS` (733 sections)
  - `OXEU` (688 sections)
  - `OLYO` (600 sections)
  - `ODIS` (590 sections)
  - `OXAO` (564 sections)
  - `OBWU` (486 sections)
  - `OOVI` (419 sections)
  - `OGWI` (385 sections)
  - `OSIT` (378 sections)

## Snapshot metrics

- Unresolved canonical subjects: 102 total
  - `O***` study-abroad codes: 96
  - non-`O***` codes: 6 (all accounted for via title overrides)

## Regenerate this analysis

Run:

`bun -e 'const fs=require("fs");const {parse}=require("csv-parse/sync");const rows=parse(fs.readFileSync("data/pub_rec_master_w2016-f2025.csv","utf8"),{columns:true,skip_empty_lines:true});const catalog=new Set(require("./data/uo-catalog-course-metadata.json").subjects.map(s=>s.code));const map=require("./data/subject-code-mappings.json");const alias=new Map(map.aliases.map(a=>[a.from,a.to]));const unresolved=new Map();for(const r of rows){const raw=r.SUBJ.trim().toUpperCase();const canon=/^O[A-Z0-9]{2,}$/.test(raw)?raw:(alias.get(raw)||raw);if(catalog.has(canon)) continue;const rec=unresolved.get(canon)||{sections:0,courses:new Set(),raw:new Set()};rec.sections++;rec.courses.add(canon+"-"+r.NUMB.trim());rec.raw.add(raw);unresolved.set(canon,rec);}const entries=[...unresolved.entries()].sort((a,b)=>b[1].sections-a[1].sections);const nonO=entries.filter(([c])=>!/^O[A-Z0-9]{2,}$/.test(c));const o=entries.filter(([c])=>/^O[A-Z0-9]{2,}$/.test(c));console.log(JSON.stringify({unresolvedTotal:entries.length,oCodes:o.length,nonOCodes:nonO.length,nonO:nonO.map(([code,v])=>({code,sections:v.sections,courses:v.courses.size,raw:[...v.raw]})),topO:o.slice(0,25).map(([code,v])=>({code,sections:v.sections,courses:v.courses.size}))},null,2));'`
