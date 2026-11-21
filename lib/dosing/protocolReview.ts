import type { DoseLog } from '../../types/doseLog';
import type { ProtocolDay } from './protocolScheduler';

export interface ProtocolReviewInput {
  readonly protocol: readonly Readonly<ProtocolDay>[];
  readonly doseLogs: readonly Readonly<DoseLog>[];
}

/** A non-prescriptive suggestion about reviewing records. */
export type ProtocolReviewSuggestion =
  | { kind: 'none' }
  | { kind: 'review-records' };

/** Suggests a review based only on the presence of both sets of records. */
export function suggestProtocolReview({
  protocol,
  doseLogs,
}: ProtocolReviewInput): ProtocolReviewSuggestion {
  if (protocol.length === 0 || doseLogs.length === 0) {
    return { kind: 'none' };
  }

  return { kind: 'review-records' };
}
