import type { PrismaClient } from '@prisma/client';
import { Errors } from '../../common/errors.js';
import { audit } from '../audit/log.js';
import { assertTransition, type SubmissionState } from './domain.js';

interface Deps {
  db: PrismaClient;
}

async function transition(
  db: PrismaClient,
  submissionId: string,
  to: SubmissionState,
  actorId: string,
  action: string,
  ip?: string,
) {
  const current = await db.submission.findUnique({ where: { id: submissionId } });
  if (!current) throw Errors.notFound('Submission not found');
  try {
    assertTransition(current.state, to);
  } catch {
    throw Errors.illegalTransition(current.state, to);
  }
  const updated = await db.submission.update({ where: { id: submissionId }, data: { state: to } });
  await audit(db, { actorId, action, entityType: 'submission', entityId: submissionId, diff: { from: current.state, to }, ip });
  return updated;
}

async function ownGameOrThrow(db: PrismaClient, gameId: string, developerId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw Errors.notFound('Game not found');
  if (game.developerId !== developerId) throw Errors.forbidden('Not your game');
  return game;
}

/** Developer submits the latest version for review. Creates the submission on first submit. */
export async function submitForReview(deps: Deps, developerId: string, gameId: string, ip?: string) {
  await ownGameOrThrow(deps.db, gameId, developerId);
  const latest = await deps.db.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });

  if (!latest) {
    const version = await deps.db.gameVersion.findFirst({ where: { gameId }, orderBy: { createdAt: 'desc' } });
    if (!version) throw Errors.conflict('Add a version before submitting for review');
    const created = await deps.db.submission.create({
      data: { gameId, versionId: version.id, state: 'PENDING_REVIEW', submittedBy: developerId },
    });
    await audit(deps.db, { actorId: developerId, action: 'submission.created', entityType: 'submission', entityId: created.id, diff: { to: 'PENDING_REVIEW' }, ip });
    return created;
  }
  if (latest.submittedBy !== developerId) throw Errors.forbidden('Not your submission');
  return transition(deps.db, latest.id, 'PENDING_REVIEW', developerId, 'submission.submitted', ip);
}

export async function withdrawSubmission(deps: Deps, developerId: string, submissionId: string, ip?: string) {
  const sub = await deps.db.submission.findUnique({ where: { id: submissionId } });
  if (!sub) throw Errors.notFound('Submission not found');
  await ownGameOrThrow(deps.db, sub.gameId, developerId);
  return transition(deps.db, submissionId, 'DRAFT', developerId, 'submission.withdrawn', ip);
}

/** Admin picks a submission from the queue. */
export async function claimSubmission(deps: Deps, adminId: string, submissionId: string, ip?: string) {
  return transition(deps.db, submissionId, 'UNDER_REVIEW', adminId, 'submission.claimed', ip);
}

export async function reviewSubmission(
  deps: Deps,
  adminId: string,
  submissionId: string,
  decision: 'APPROVED' | 'CHANGES_REQUIRED' | 'REJECTED',
  comment: string,
  ip?: string,
) {
  if (!comment.trim()) throw Errors.validation('Review feedback is required');
  const sub = await deps.db.submission.findUnique({ where: { id: submissionId } });
  if (!sub) throw Errors.notFound('Submission not found');
  const updated = await transition(deps.db, submissionId, decision, adminId, `submission.${decision.toLowerCase()}`, ip);
  const review = await deps.db.review.create({
    data: { submissionId, reviewerId: adminId, decision, comment },
  });
  return { submission: updated, review };
}

export async function publishGame(deps: Deps, developerId: string, gameId: string, ip?: string) {
  await ownGameOrThrow(deps.db, gameId, developerId);
  const latest = await deps.db.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });
  if (!latest) throw Errors.conflict('Nothing to publish');
  if (latest.submittedBy !== developerId) throw Errors.forbidden('Not your submission');
  return transition(deps.db, latest.id, 'PUBLISHED', developerId, 'game.published', ip);
}

/** Latest submission + admin feedback for the owning developer. */
export async function latestSubmissionForGame(deps: Pick<Deps, 'db'>, developerId: string, gameId: string) {
  await ownGameOrThrow(deps.db, gameId, developerId);
  return deps.db.submission.findFirst({
    where: { gameId },
    orderBy: { updatedAt: 'desc' },
    include: { reviews: { orderBy: { createdAt: 'asc' } }, version: { select: { version: true } } },
  });
}

export async function submissionHistory(deps: Pick<Deps, 'db'>, submissionId: string) {  const submission = await deps.db.submission.findUnique({
    where: { id: submissionId },
    include: {
      game: { select: { id: true, title: true, slug: true } },
      version: { select: { id: true, version: true } },
      reviews: { orderBy: { createdAt: 'asc' }, include: { reviewer: { select: { email: true } } } },
    },
  });
  if (!submission) throw Errors.notFound('Submission not found');
  const trail = await deps.db.auditLog.findMany({
    where: { entityType: 'submission', entityId: submissionId },
    orderBy: { createdAt: 'asc' },
  });
  return { submission, trail };
}

export async function reviewQueue(deps: Pick<Deps, 'db'>, state?: SubmissionState) {
  return deps.db.submission.findMany({
    where: state ? { state } : { state: { in: ['PENDING_REVIEW', 'UNDER_REVIEW'] } },
    orderBy: { updatedAt: 'asc' },
    include: {
      game: { select: { id: true, title: true, slug: true, genre: true } },
      version: { select: { version: true } },
      submitter: { select: { email: true } },
    },
  });
}
