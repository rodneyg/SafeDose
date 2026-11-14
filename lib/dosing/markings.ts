/** Exact raw marking and existing two-decimal guidance, including float noise. */
export function getMarkingGuidance(calculatedVolume: number, syringeType: 'Insulin' | 'Standard', markingsString: string) {
  const markings = markingsString.split(',').map((m: string) => parseFloat(m));
  const markingScaleValue = syringeType === 'Insulin' ? calculatedVolume * 100 : calculatedVolume;

  const nearestMarking = markings.reduce((prev: number, curr: number) =>
    Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
  );

  // Set recommended marking to the exact calculated value instead of nearest marking
  const recommendedMarking = markingScaleValue.toString();

  // Provide guidance when exact dose falls between standard markings
  let precisionMessage = null;
  if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
    const unitLabel = syringeType === 'Insulin' ? 'units' : 'ml';
    const exactValue = markingScaleValue.toFixed(2);
    const nearestValue = nearestMarking.toString();

    // Find the two markings that the exact value falls between
    const sortedMarkings = markings.sort((a, b) => a - b);
    const lowerMark = sortedMarkings.filter(m => m <= markingScaleValue).pop();
    const upperMark = sortedMarkings.find(m => m > markingScaleValue);

    if (lowerMark !== undefined && upperMark !== undefined) {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is between the ${lowerMark} ${unitLabel} and ${upperMark} ${unitLabel} marks.`;
    } else if (markingScaleValue < markings[0]) {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is below the first marking at ${markings[0]} ${unitLabel}.`;
    } else {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is above the ${nearestValue} ${unitLabel} mark.`;
    }
  }

  return { recommendedMarking, precisionMessage };
}
