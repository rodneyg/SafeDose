export interface ProtocolDay<T = unknown> {
  day: number;
  dose: T;
}

export type ScheduledProtocolDay<T = unknown> = ProtocolDay<T> & {
  date?: string;
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) throw new Error('Start date must use YYYY-MM-DD format.');

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error('Start date must be a valid calendar date.');
  }
  return parsed;
}

/**
 * Optionally translates one-based protocol days into date-only calendar values.
 * Date-only input and UTC arithmetic keep results independent of the device timezone.
 */
export function scheduleProtocol<T>(
  protocol: readonly ProtocolDay<T>[],
  startDate?: string | null,
): ScheduledProtocolDay<T>[] {
  if (!startDate) {
    return protocol.map((entry) => {
      const unscheduled: ScheduledProtocolDay<T> = { ...entry };
      delete unscheduled.date;
      return unscheduled;
    });
  }

  const start = parseDateOnly(startDate);
  return protocol.map((entry) => {
    if (!Number.isInteger(entry.day) || entry.day < 1) {
      throw new Error('Protocol days must be positive whole numbers.');
    }

    const scheduled = new Date(start);
    scheduled.setUTCDate(start.getUTCDate() + entry.day - 1);
    return { ...entry, date: scheduled.toISOString().slice(0, 10) };
  });
}
