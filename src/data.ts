import generatedCustomers from './generated-customers.json';
import type { Customer, CustomerEvent, Transaction, Channel } from './types';
export const at = (day: number, time = '12:00') =>
  `2026-09-${String(day).padStart(2, '0')}T${time}:00+05:30`;
export const endOfDay = (day: number) => at(day, '23:59');
export const dayOf = (date: string) => Number(date.slice(8, 10));
function tx(
  id: string,
  day: number,
  amount: number,
  direction: 'in' | 'out',
  counterparty: string,
  category: Transaction['category'],
  channel: Channel = 'Digital banking',
  options: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    at: at(day),
    amount,
    direction,
    counterparty,
    account: counterparty.toLowerCase().replaceAll(' ', '-'),
    category,
    channel,
    status: 'Completed',
    signals: [],
    risk: 5,
    ...options,
  };
}
function event(
  id: string,
  day: number,
  title: string,
  detail: string,
  kind: CustomerEvent['kind'],
  transactionIds?: string[],
): CustomerEvent {
  return { id, at: at(day), title, detail, kind, transactionIds };
}
const history: Customer['loan']['history'] = [
  { month: 'Jun 2026', status: 'Paid', daysLate: 0 },
  { month: 'Jul 2026', status: 'Paid', daysLate: 0 },
  { month: 'Aug 2026', status: 'Paid', daysLate: 0 },
];
function base(id: string, name: string): Customer {
  return {
    id,
    name,
    occupation: 'Salaried professional',
    city: 'New Delhi',
    salary: 85000,
    expenses: 42000,
    openingCash: 41000,
    openingCredit: 4000,
    creditLimit: 60000,
    usualTransfer: 3500,
    loan: {
      principal: 360000,
      emi: 18000,
      dueAt: at(27),
      salaryAt: '2026-10-01T09:00:00+05:30',
      history: history.map((x) => ({ ...x })),
    },
    transactions: [],
    events: [],
    scorePoints: [],
  };
}
const arjun: Customer = {
  ...base('MR-1001', 'Arjun Mehta'),
  occupation: 'Product designer',
  story: 'Scam shock → EMI pressure',
  transactions: [
    tx('A-SAL', 1, 85000, 'in', 'Orbit Studio', 'salary'),
    tx('A-RENT', 2, 18000, 'out', 'Monthly rent', 'essential'),
    tx('A-BILL', 10, 12000, 'out', 'Utilities & household', 'essential', 'Card'),
    tx('A-T1', 13, 47000, 'out', 'New beneficiary B-482', 'transfer', 'UPI', {
      at: at(13, '14:02'),
      risk: 89,
      newBeneficiary: true,
      unusualDevice: true,
      signals: ['New beneficiary', '13.4× usual transfer', 'Unusual device'],
    }),
    tx('A-T2', 13, 31000, 'out', 'New beneficiary B-482', 'transfer', 'UPI', {
      at: at(13, '14:08'),
      risk: 91,
      newBeneficiary: true,
      unusualDevice: true,
      signals: ['Six-minute velocity', 'New beneficiary', 'Unusual device'],
    }),
    tx('A-CREDIT', 17, 6000, 'in', 'Emergency credit draw', 'credit', 'Digital banking', {
      at: at(17, '09:00'),
    }),
    tx('A-ESS1', 17, 5000, 'out', 'Groceries & medicine', 'essential', 'Wallet'),
    tx('A-ESS2', 20, 4000, 'out', 'Utilities', 'essential', 'Card'),
    tx('A-ESS3', 23, 3000, 'out', 'Essential transport', 'essential', 'UPI'),
    tx('A-FUTURE', 25, 6000, 'out', 'Scheduled essentials', 'essential', 'Digital banking', {
      status: 'Pending',
      knownAt: at(1),
    }),
  ],
  events: [
    event(
      'A-E1',
      1,
      'Stable financial position',
      'Salary ₹85,000 received. Three installments paid on time; recurring expense budget ₹42,000 and EMI ₹18,000.',
      'baseline',
      ['A-SAL'],
    ),
    event(
      'A-E2',
      12,
      'Unusual device observed',
      'Synthetic session S-902: first-seen Android device; usual device absent. Device change alone is not proof of scam.',
      'device',
    ),
    {
      ...event(
        'A-E3',
        13,
        'Two transfers · six minutes apart',
        '₹47,000 at 14:02 and ₹31,000 at 14:08 to B-482, a first-seen beneficiary. Completed outflow ₹78,000; balance ₹96,000 → ₹18,000. Customer confirmation pending.',
        'transfer',
        ['A-T1', 'A-T2'],
      ),
      at: at(13, '14:08'),
    },
    event(
      'A-E4',
      17,
      'Credit reliance increases',
      '₹6,000 emergency draw increases both cash and debt. ₹5,000 essential spending. Reduced buffer persists.',
      'liquidity',
      ['A-CREDIT', 'A-ESS1'],
    ),
    event(
      'A-E5',
      20,
      'Liquidity pressure persists',
      'Another ₹4,000 essential outflow. Income and recurring expense budget unchanged; suspected loss is separate from consumption.',
      'liquidity',
      ['A-ESS2'],
    ),
    event(
      'A-E6',
      24,
      'EMI precedes the next salary',
      'Balance ₹12,000, with ₹6,000 committed before the ₹18,000 EMI on 27 Sep. Next salary 1 Oct; forecast EMI shortfall ₹12,000. Not overdue.',
      'liquidity',
      ['A-ESS3'],
    ),
  ],
  scorePoints: [
    { day: 1, scam: 8, repayment: 17 },
    { day: 12, scam: 23, repayment: 17 },
    { day: 13, scam: 91, repayment: 22, episodeDay: 13 },
    { day: 17, scam: 91, repayment: 31, episodeDay: 13 },
    { day: 20, scam: 91, repayment: 46, episodeDay: 13 },
    { day: 24, scam: 91, repayment: 68, episodeDay: 13 },
  ],
};
const healthy: Customer = {
  ...base('MR-1002', 'Priya Sharma'),
  occupation: 'Engineering manager',
  story: 'Healthy customer',
  openingCash: 90000,
  salary: 110000,
  expenses: 45000,
  transactions: [
    tx('P-SAL', 1, 110000, 'in', 'Vertex Labs', 'salary'),
    tx('P-RENT', 5, 25000, 'out', 'Monthly rent', 'essential'),
    tx('P-CARD', 17, 20000, 'out', 'Household essentials', 'essential', 'Card'),
  ],
  events: [
    event(
      'P-E1',
      1,
      'Salary received on schedule',
      'Consistent income and three on-time installments.',
      'baseline',
      ['P-SAL'],
    ),
    event(
      'P-E2',
      17,
      'Routine monthly spending',
      'Known counterparties and sufficient liquidity for the next EMI.',
      'liquidity',
      ['P-CARD'],
    ),
    event(
      'P-E3',
      24,
      'Comfortable repayment buffer',
      'Cash covers the upcoming EMI and essential commitments. No suspicious transfer evidence.',
      'liquidity',
    ),
  ],
  scorePoints: [
    { day: 1, scam: 6, repayment: 12 },
    { day: 17, scam: 7, repayment: 13 },
    { day: 24, scam: 7, repayment: 11 },
  ],
};
const organic: Customer = {
  ...base('MR-1003', 'Neha Rao'),
  occupation: 'Operations associate',
  story: 'Income interruption',
  salary: 65000,
  expenses: 38000,
  openingCash: 52000,
  loan: { ...base('x', 'x').loan, emi: 20000, principal: 280000 },
  transactions: [
    tx('N-RENT', 5, 18000, 'out', 'Monthly rent', 'essential'),
    tx('N-ESS', 17, 20000, 'out', 'Family & household', 'essential', 'Card'),
    tx('N-CREDIT', 20, 4000, 'in', 'Emergency credit draw', 'credit'),
    tx('N-FUTURE', 25, 8000, 'out', 'Scheduled essentials', 'essential', 'Digital banking', {
      status: 'Pending',
      knownAt: at(1),
    }),
  ],
  events: [
    event(
      'N-E1',
      1,
      'Salary credit is absent',
      'Expected ₹65,000 salary not received; verification needed.',
      'income',
    ),
    event(
      'N-E2',
      12,
      'Income interruption reported',
      'Synthetic payroll notice: salary delayed. No unusual-device or beneficiary evidence.',
      'income',
    ),
    event(
      'N-E3',
      17,
      'Essential costs reduce liquidity',
      'Regular household commitments continue while salary is delayed.',
      'liquidity',
      ['N-ESS'],
    ),
    event(
      'N-E4',
      20,
      'Emergency borrowing',
      '₹4,000 credit draw funds essentials; adds to liabilities.',
      'liquidity',
      ['N-CREDIT'],
    ),
    event(
      'N-E5',
      24,
      'Repayment forecast deteriorates',
      'EMI precedes expected salary. Cash-flow review needed, without a scam-victim inference.',
      'liquidity',
    ),
  ],
  scorePoints: [
    { day: 1, scam: 8, repayment: 24 },
    { day: 12, scam: 8, repayment: 39 },
    { day: 17, scam: 9, repayment: 52 },
    { day: 20, scam: 9, repayment: 61 },
    { day: 24, scam: 9, repayment: 73 },
  ],
};
const mule: Customer = {
  ...base('MR-1004', 'Rohan Kapoor'),
  occupation: 'Independent consultant',
  story: 'Fan-in / rapid pass-through',
  openingCash: 75000,
  openingCredit: 0,
  loan: { ...base('x', 'x').loan, emi: 12000, principal: 190000 },
  transactions: [
    tx('R-IN1', 13, 25000, 'in', 'Sender S-201', 'transfer', 'UPI', {
      at: at(13, '10:01'),
      risk: 67,
      signals: ['First-seen sender'],
    }),
    tx('R-IN2', 13, 32000, 'in', 'Sender S-202', 'transfer', 'Wallet', {
      at: at(13, '10:04'),
      risk: 73,
      signals: ['Multiple unrelated senders'],
    }),
    tx('R-IN3', 13, 21000, 'in', 'Sender S-203', 'transfer', 'Digital banking', {
      at: at(13, '10:06'),
      risk: 77,
      signals: ['Fan-in'],
    }),
    tx('R-OUT', 13, 75000, 'out', 'Onward account B-719', 'transfer', 'Digital banking', {
      at: at(13, '10:13'),
      risk: 94,
      newBeneficiary: true,
      signals: ['Rapid onward transfer', '96% pass-through'],
    }),
    tx('R-ESS', 17, 20000, 'out', 'Household essentials', 'essential', 'Card'),
  ],
  events: [
    event(
      'R-E1',
      1,
      'Baseline account activity',
      'Adequate liquidity; no income interruption observed.',
      'baseline',
    ),
    {
      ...event(
        'R-E2',
        13,
        'Fan-in followed by rapid onward flow',
        'Three distinct senders transfer ₹78,000; ₹75,000 moves onward within 12 minutes. Pattern needs investigation, not a presumption of guilt.',
        'transfer',
        ['R-IN1', 'R-IN2', 'R-IN3', 'R-OUT'],
      ),
      at: at(13, '10:13'),
    },
    event(
      'R-E3',
      24,
      'No victim-loss inference',
      'Focal account retains ₹3,000 of inbound flow. Investigate the pass-through pattern; no evidence of scam-induced cash depletion.',
      'verification',
    ),
  ],
  scorePoints: [
    { day: 1, scam: 12, repayment: 19 },
    { day: 13, scam: 94, repayment: 21, episodeDay: 13 },
    { day: 24, scam: 94, repayment: 23, episodeDay: 13 },
  ],
};
const uncertain: Customer = {
  ...base('MR-1005', 'Dev Shah'),
  occupation: 'Architect',
  story: 'Conflicting evidence',
  openingCash: 120000,
  transactions: [
    tx('D-SAL', 1, 85000, 'in', 'Frame Architecture', 'salary'),
    tx('D-ESS', 5, 32000, 'out', 'Household commitments', 'essential', 'Card'),
    tx('D-LARGE', 13, 68000, 'out', 'Property services B-305', 'transfer', 'Digital banking', {
      risk: 58,
      newBeneficiary: true,
      signals: ['Large first payment', 'Invoice not independently verified'],
    }),
  ],
  events: [
    event(
      'D-E1',
      1,
      'Stable income and buffer',
      'Regular salary and on-time repayment history.',
      'baseline',
      ['D-SAL'],
    ),
    event(
      'D-E2',
      13,
      'Large payment to new beneficiary',
      '₹68,000 outgoing payment. Familiar device; no burst or pass-through. Purpose not independently verified.',
      'transfer',
      ['D-LARGE'],
    ),
    event(
      'D-E3',
      20,
      'Payment purpose reported',
      'Synthetic customer note claims a property deposit. An invoice exists but beneficiary ownership is unverified. Authorized payment does not establish legitimacy.',
      'verification',
    ),
    event(
      'D-E4',
      24,
      'Evidence remains incomplete',
      'Adequate EMI funds; conflicting evidence routes to manual verification.',
      'verification',
    ),
  ],
  scorePoints: [
    { day: 1, scam: 10, repayment: 14 },
    { day: 13, scam: 58, repayment: 20 },
    { day: 20, scam: 43, repayment: 19 },
    { day: 24, scam: 43, repayment: 18 },
  ],
};
export const customers: Customer[] = [
  arjun, healthy, organic, mule, uncertain,
  ...(generatedCustomers as Customer[]),
];
export const detailedCustomers = customers.slice(0, 5);

