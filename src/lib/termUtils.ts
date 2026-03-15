import type { SectionRow } from './dataClient';

export function abbreviateTermDesc(termDesc: string): string {
  return termDesc
    .replace(/^Fall /, 'F ')
    .replace(/^Winter /, 'W ')
    .replace(/^Spring /, 'Sp ')
    .replace(/^Summer /, 'Su ');
}

export function getTermRangeChip(sections: SectionRow[]): string | null {
  if (sections.length === 0) return null;
  let minTerm = sections[0].term;
  let maxTerm = sections[0].term;
  let minDesc = sections[0].termDesc;
  let maxDesc = sections[0].termDesc;
  for (const s of sections) {
    if (s.term < minTerm) {
      minTerm = s.term;
      minDesc = s.termDesc;
    }
    if (s.term > maxTerm) {
      maxTerm = s.term;
      maxDesc = s.termDesc;
    }
  }
  const minAbbr = abbreviateTermDesc(minDesc);
  const maxAbbr = abbreviateTermDesc(maxDesc);
  if (minTerm === maxTerm) return minAbbr;
  return `${minAbbr} – ${maxAbbr}`;
}

export function termRangeChipFromDescriptions(
  firstTermDesc: string | undefined,
  lastTermDesc: string | undefined
): string | null {
  if (!firstTermDesc || !lastTermDesc) return null;
  const first = abbreviateTermDesc(firstTermDesc);
  const last = abbreviateTermDesc(lastTermDesc);
  if (firstTermDesc === lastTermDesc) return first;
  return `${first} – ${last}`;
}
