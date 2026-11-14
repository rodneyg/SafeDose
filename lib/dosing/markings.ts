import { Exact } from './exact';
export function getMarkingGuidance(calculatedVolume: number | Exact, syringeType: 'Insulin' | 'Standard', markingsString: string) {
  const markings = markingsString.split(',').map((m: string) => parseFloat(m));
  const exactMarking = new Exact(calculatedVolume).mul(syringeType === 'Insulin' ? 100 : 1);
  const markingScaleValue = exactMarking.toNumber();

  const nearestMarking = markings.reduce((prev: number, curr: number) =>
    exactMarking.distance(new Exact(curr)).compare(exactMarking.distance(new Exact(prev))) < 0 ? curr : prev
  );

  // Set recommended marking to the exact calculated value instead of nearest marking
  const recommendedMarking = exactMarking.toString();

  // Provide guidance when exact dose falls between standard markings
  let precisionMessage = null;
  if (exactMarking.distance(new Exact(nearestMarking)).compare(0.01) > 0) {
    const unitLabel = syringeType === 'Insulin' ? 'units' : 'ml';
    const exactValue = exactMarking.fixed(2);
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
