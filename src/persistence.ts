import type { Assessment, CaseRecord, Customer, Intervention } from './types';
export const STORAGE_KEY = 'meridian.cases.v1';
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadCases(storage: StorageAdapter): CaseRecord[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (c) =>
        !c.id ||
        !c.customerId ||
        !Array.isArray(c.activity) ||
        !Array.isArray(c.notes) ||
        !Array.isArray(c.checklist),
    )
  )
    throw new Error('Saved case data is invalid. Reset saved cases explicitly to recover.');
  return parsed;
}
export function saveCases(storage: StorageAdapter, cases: CaseRecord[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify(cases));
}
export function createCase(
  cases: CaseRecord[],
  c: Customer,
  asOf: string,
  a: Intervention,
  assessment: Assessment,
  now = new Date().toISOString(),
): { cases: CaseRecord[]; record: CaseRecord; created: boolean } {
  const existing = cases.find((r) => r.customerId === c.id && r.kind === a.kind);
  if (existing) return { cases, record: existing, created: false };
  const record: CaseRecord = {
    id: `CASE-${String(cases.length + 1).padStart(3, '0')}`,
    customerId: c.id,
    kind: a.kind,
    title: a.title,
    priority: a.priority,
    owner: 'A. Sen',
    status: 'Open',
    createdAt: now,
    evidenceAsOf: asOf,
    evidenceIds: assessment.evidence.map((e) => e.id),
    explanation: assessment.explanation,
    followUp: '',
    contactOutcome: 'Not contacted',
    disposition: '',
    checklist: [],
    notes: [],
    activity: [
      {
        at: now,
        text: `Task created: ${a.title}. Evidence captured as of ${dateLabelSafe(asOf)}. No banking action executed.`,
      },
    ],
  };
  return { cases: [record, ...cases], record, created: true };
}
const dateLabelSafe = (s: string) => s.slice(0, 10);
export function updateCase(
  c: CaseRecord,
  patch: Partial<CaseRecord>,
  description: string,
  now = new Date().toISOString(),
): CaseRecord {
  return { ...c, ...patch, activity: [...c.activity, { at: now, text: description }] };
}
