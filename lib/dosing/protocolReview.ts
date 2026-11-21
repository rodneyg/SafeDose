import type { DoseLog } from '../../types/doseLog';
import type { ProtocolDay } from './protocolScheduler';

export interface ProtocolReviewInput {
  readonly protocolCompound: string;
  readonly protocol: readonly Readonly<ProtocolDay>[];
  readonly doseLogs: readonly Readonly<Partial<Pick<DoseLog, 'substanceName'>>>[];
}

/** A non-prescriptive suggestion about reviewing records. */
export type ProtocolReviewSuggestion =
  | { kind: 'none' }
  | { kind: 'review-records' };

/** Suggests a review when a named protocol has a matching dose log. */
export function suggestProtocolReview({
  protocolCompound,
  protocol,
  doseLogs,
}: ProtocolReviewInput): ProtocolReviewSuggestion {
  const compound = protocolCompound.trim().toLowerCase();
  if (protocol.length === 0 || !compound || compound === 'unknown') {
    return { kind: 'none' };
  }

  const hasMatchingLog = doseLogs.some(({ substanceName }) =>
    typeof substanceName === 'string' && substanceName.trim().toLowerCase() === compound,
  );
  return hasMatchingLog ? { kind: 'review-records' } : { kind: 'none' };
}
