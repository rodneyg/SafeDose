/** Keep calculator error codes available to flow control, out of visible text. */
export function calculationErrorMessage(message: string): string {
  return message.replace(/^VOLUME_THRESHOLD_ERROR:\s*/, '');
}
