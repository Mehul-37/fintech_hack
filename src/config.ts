// Model thresholds use synthetic validation; context thresholds are prototype rules.
import artifacts from './ml-models.json';
export const thresholds = {
  scamAlert: artifacts.thresholds.fraud,
  repaymentWarning: artifacts.thresholds.repayment,
  scamContextConfidence: 75, // Conservative narrative gate; not a fitted alert threshold.
  largeTransferMultiple: 5,
  shockFraction: 0.5,
  repaymentRise: 20,
  passThrough: 0.85,
  rapidMinutes: 20,
  minimumSenders: 3,
};
