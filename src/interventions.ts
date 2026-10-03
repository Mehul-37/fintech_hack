import type { Customer, Intervention } from './types';
import { assessContext } from './context';
export function interventions(
  c: Customer,
  asOf: string,
  assessment = assessContext(c, asOf),
): Intervention[] {
  const action = (
    kind: Intervention['kind'],
    title: string,
    detail: string,
    priority: Intervention['priority'] = 'High',
  ): Intervention => ({ kind, title, detail, priority });
  switch (assessment.context) {
    case 'Possible scam-linked distress':
      return [
        action(
          'investigation',
          'Create fraud investigation',
          'Review completed transfers and recovery options. Confirmation pending.',
        ),
        action(
          'support',
          'Request repayment-support review',
          'Manual affordability review. Terms and scores stay unchanged.',
        ),
        action(
          'beneficiary',
          'Request beneficiary review',
          'Review B-482 and future payments; completed transfers cannot be held.',
        ),
        action(
          'reminder',
          'Draft EMI reminder',
          'Create a reminder draft task. No message is sent.',
          'Low',
        ),
      ];
    case 'Suspected scam':
      return [
        action(
          'investigation',
          'Create fraud investigation',
          'Verify customer report and completed payment evidence.',
        ),
        action(
          'beneficiary',
          'Request beneficiary review',
          'Review future payments and recovery options; no retroactive hold.',
        ),
      ];
    case 'Possible mule':
      return [
        action(
          'investigation',
          'Investigate pass-through activity',
          'Verify sender relationships, source of funds, and rapid onward transfers. No victim-support inference.',
        ),
      ];
    case 'Organic distress':
      return [
        action(
          'cashflow',
          'Create income / cash-flow review',
          'Verify payroll interruption and upcoming commitments.',
          'Medium',
        ),
        action(
          'support',
          'Request repayment-support review',
          'Human assessment required; no automatic restructuring.',
          'Medium',
        ),
      ];
    case 'Uncertain / manual review':
      return [
        action(
          'verification',
          'Create manual verification',
          'Confirm device, payment purpose and beneficiary ownership.',
          'Medium',
        ),
      ];
    default:
      return [];
  }
}
