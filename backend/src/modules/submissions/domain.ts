// Pure submission state machine — no I/O, fully unit-tested.
// Mirrors docs/DATABASE.md §2. No boolean flags; explicit states + transitions.
export const SubmissionStates = [
  'DRAFT',
  'PENDING_REVIEW',
  'UNDER_REVIEW',
  'APPROVED',
  'CHANGES_REQUIRED',
  'REJECTED',
  'PUBLISHED',
] as const;

export type SubmissionState = (typeof SubmissionStates)[number];

const ALLOWED: Record<SubmissionState, SubmissionState[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['UNDER_REVIEW', 'DRAFT'],
  UNDER_REVIEW: ['APPROVED', 'CHANGES_REQUIRED', 'REJECTED'],
  CHANGES_REQUIRED: ['DRAFT'],
  APPROVED: ['PUBLISHED', 'DRAFT'],
  REJECTED: [],
  PUBLISHED: [],
};

export function canTransition(from: SubmissionState, to: SubmissionState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: SubmissionState, to: SubmissionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot transition submission from ${from} to ${to}`);
  }
}

/** States in which the developer may edit game metadata for this submission cycle. */
export function isEditableByDeveloper(state: SubmissionState): boolean {
  return state === 'DRAFT' || state === 'CHANGES_REQUIRED';
}

/** Queue states shown on the admin dashboard as actionable work. */
export function isActionableByAdmin(state: SubmissionState): boolean {
  return state === 'PENDING_REVIEW' || state === 'UNDER_REVIEW';
}
