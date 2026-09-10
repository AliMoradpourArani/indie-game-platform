import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition, isActionableByAdmin, isEditableByDeveloper, } from '../../src/modules/submissions/domain.js';
describe('submission state machine', () => {
    it('allows the happy path DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED → PUBLISHED', () => {
        const path = [
            ['DRAFT', 'PENDING_REVIEW'],
            ['PENDING_REVIEW', 'UNDER_REVIEW'],
            ['UNDER_REVIEW', 'APPROVED'],
            ['APPROVED', 'PUBLISHED'],
        ];
        for (const [from, to] of path) {
            expect(canTransition(from, to)).toBe(true);
            expect(() => assertTransition(from, to)).not.toThrow();
        }
    });
    it('allows the changes-requested loop back to DRAFT', () => {
        expect(canTransition('UNDER_REVIEW', 'CHANGES_REQUIRED')).toBe(true);
        expect(canTransition('CHANGES_REQUIRED', 'DRAFT')).toBe(true);
        expect(canTransition('DRAFT', 'PENDING_REVIEW')).toBe(true);
    });
    it('rejects illegal transitions (no boolean soup, no skipping review)', () => {
        const illegal = [
            ['DRAFT', 'APPROVED'],
            ['DRAFT', 'PUBLISHED'],
            ['PENDING_REVIEW', 'APPROVED'],
            ['APPROVED', 'UNDER_REVIEW'],
            ['PUBLISHED', 'DRAFT'],
            ['REJECTED', 'DRAFT'],
        ];
        for (const [from, to] of illegal) {
            expect(canTransition(from, to)).toBe(false);
            expect(() => assertTransition(from, to)).toThrow();
        }
    });
    it('exposes correct edit/review responsibilities', () => {
        expect(isEditableByDeveloper('DRAFT')).toBe(true);
        expect(isEditableByDeveloper('CHANGES_REQUIRED')).toBe(true);
        expect(isEditableByDeveloper('UNDER_REVIEW')).toBe(false);
        expect(isActionableByAdmin('PENDING_REVIEW')).toBe(true);
        expect(isActionableByAdmin('UNDER_REVIEW')).toBe(true);
        expect(isActionableByAdmin('PUBLISHED')).toBe(false);
    });
});
//# sourceMappingURL=submissionTransitions.test.js.map