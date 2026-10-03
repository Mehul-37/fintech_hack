import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { motion, useReducedMotion } from 'motion/react';
import type { Context, Customer } from './types';
import { dayOf, endOfDay } from './data';
import { scoreProvider } from './engine';
import { financialState } from './selectors';
import { riskLabel } from './format';
export const contextClass = (c: Context) =>
  c === 'Healthy'
    ? 'healthy'
    : c === 'Possible mule'
      ? 'mule'
      : c === 'Organic distress'
        ? 'organic'
        : c.includes('scam')
          ? 'scam'
          : 'uncertain';
export function Badge({ context }: { context: Context }) {
  return (
    <span className={`badge ${contextClass(context)}`}>
      <span className="badge-dot" />
      {context}
    </span>
  );
}
export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}
export function Score({
  value,
  label,
  baseline,
  color,
  caption,
}: {
  value: number;
  label: string;
  baseline: number;
  color: string;
  caption: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Card className="score-card">
      <div className="eyebrow">
        <span className={`line-key ${color}`} />
        {label}
        <span title="Trained on synthetic data. Repayment estimates seven-day delinquency; scam episode peaks are historical maxima, not account probabilities." className="score-info">
          0–100
        </span>
      </div>
      <div className="score-row">
        <motion.strong
          key={value}
          initial={reduce ? false : { opacity: 0.45, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={color}
        >
          {riskLabel(value)}
        </motion.strong>
        <span className={`delta ${value > baseline ? 'up' : ''}`}>
          {value > baseline ? '+' : ''}
          {(value - baseline).toFixed(1)} <small>vs baseline</small>
        </span>
      </div>
      <div className="score-track">
        <span style={{ width: `${value}%` }} className={color} />
      </div>
      <p className="muted mini">{caption}</p>
    </Card>
  );
}
export function RiskChart({ customer, day }: { customer: Customer; day: number }) {
  const points = Array.from({ length: day }, (_, i) => {
    const snapshot = scoreProvider.score(customer, endOfDay(i + 1));
    const financial = financialState(customer, endOfDay(i + 1));
    return { day: i + 1, scam: snapshot.scamScore, repayment: snapshot.repaymentScore,
      cashGap: Math.min(100, 100 * financial.shortfall / customer.loan.emi), label: `Sep ${i + 1}` };
  });
  const current = scoreProvider.score(customer, endOfDay(day));
  const data =
    points.at(-1)?.day === day
      ? points
      : [
          ...points,
          { day, scam: current.scamScore, repayment: current.repaymentScore,
            cashGap: Math.min(100, 100 * financialState(customer, endOfDay(day)).shortfall / customer.loan.emi), label: `Sep ${day}` },
        ];
  return (
    <div
      className="risk-chart"
      aria-label={`Shared risk timeline. Scam ${current.scamScore}, repayment ${current.repaymentScore}, as of September ${day}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 25, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="scam-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ce684d" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#ce684d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e8eeeb" strokeDasharray="3 5" />
          <XAxis
            dataKey="day"
            type="number"
            domain={[1, 24]}
            ticks={[1, 6, 12, 17, 20, 24]}
            tickFormatter={(v) => `Sep ${v}`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#60736c', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#60736c', fontSize: 11 }}
          />
          <Tooltip
            labelFormatter={(v) => `September ${v}, 2026`}
            formatter={(v) => `${Number(v).toFixed(1)}%`}
            contentStyle={{ borderRadius: 10, border: '1px solid #dde5df', fontSize: 12 }}
          />
          <Area
            name="Scam episode peak · ML"
            dataKey="scam"
            type="stepAfter"
            stroke="#ba5036"
            strokeWidth={2.8}
            fill="url(#scam-fill)"
            isAnimationActive={false}
            dot={{ r: 3 }}
          />
          <Line
            name="Repayment Risk · ML"
            dataKey="repayment"
            type="stepAfter"
            stroke="#44776c"
            strokeWidth={2.8}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line name="Due-date cash gap · % of EMI (ledger, not ML)" dataKey="cashGap"
            type="stepAfter" stroke="#9b761e" strokeWidth={2} strokeDasharray="2 4"
            dot={false} isAnimationActive={false} />
          <ReferenceLine x={day} stroke="#7d8e86" strokeDasharray="2 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function PortfolioChart({
  rows,
  onOpen,
}: {
  rows: { customer: Customer; scam: number; repayment: number; context: Context }[];
  onOpen: (c: Customer) => void;
}) {
  return (
    <div className="scatter-chart">
      <div className="plot-y-label">Repayment Risk ↑</div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 25, bottom: 15, left: 5 }}>
          <CartesianGrid stroke="#e4ebe6" strokeDasharray="3 5" />
          <XAxis
            type="number"
            dataKey="scam"
            domain={[0, 100]}
            name="Scam Risk"
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="repayment"
            domain={[0, 100]}
            name="Repayment Risk"
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  <b>{payload[0].payload.customer.name}</b>
                  <p>{payload[0].payload.context}</p>
                  <span>
                    Scam {payload[0].payload.scam} · Repayment {payload[0].payload.repayment}
                  </span>
                </div>
              ) : null
            }
          />
          <ReferenceLine x={70} stroke="#d5b8ad" strokeDasharray="4 4" />
          <ReferenceLine y={60} stroke="#b6cdc4" strokeDasharray="4 4" />
          <Scatter
            data={rows}
            onClick={(p) => onOpen(p.payload.customer)}
            shape={(props: any) => (
              <g
                role="button"
                tabIndex={0}
                aria-label={`Open ${props.payload.customer.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(props.payload.customer);
                  }
                }}
              >
                {props.payload.context === 'Possible mule' ? (
                  <rect
                    x={props.cx - 7}
                    y={props.cy - 7}
                    width={14}
                    height={14}
                    rx={2}
                    fill={props.fill}
                    stroke="white"
                    strokeWidth={2}
                  />
                ) : props.payload.context === 'Organic distress' ||
                  props.payload.context === 'Uncertain / manual review' ? (
                  <path
                    d={`M ${props.cx} ${props.cy - 9} L ${props.cx + 8} ${props.cy} L ${props.cx} ${props.cy + 9} L ${props.cx - 8} ${props.cy} Z`}
                    fill={props.fill}
                    stroke="white"
                    strokeWidth={2}
                  />
                ) : props.payload.context.includes('scam') ? (
                  <path
                    d={`M ${props.cx} ${props.cy - 9} L ${props.cx + 9} ${props.cy + 7} L ${props.cx - 9} ${props.cy + 7} Z`}
                    fill={props.fill}
                    stroke="white"
                    strokeWidth={2}
                  />
                ) : (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={props.payload.customer.story ? 8 : 5}
                    fill={props.fill}
                    stroke="white"
                    strokeWidth={2}
                  />
                )}
                {props.payload.customer.story && (
                  <text x={props.cx + 12} y={props.cy + 4} fontSize={11} fill="#43594e">
                    {props.payload.customer.name.split(' ')[0]}
                  </text>
                )}
              </g>
            )}
          >
            <>
              {rows.map((r) => (
                <Cell
                  key={r.customer.id}
                  fill={
                    r.context === 'Healthy'
                      ? '#6c9184'
                      : r.context === 'Possible mule'
                        ? '#8b7299'
                        : r.context === 'Organic distress'
                          ? '#b99044'
                          : r.context.includes('scam')
                            ? '#c36a52'
                            : '#8097aa'
                  }
                />
              ))}
            </>
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="plot-x-label">Scam Risk →</div>
    </div>
  );
}
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="sheet">
          <div className="sheet-heading">
            <div>
              <span className="eyebrow">Evidence workspace</span>
              <Dialog.Title>{title}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close detail">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <ArrowUpRight size={24} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function EventDay({ date }: { date: string }) {
  return (
    <span className="day-pill">
      {dayOf(date)}
      <small>SEP</small>
    </span>
  );
}
