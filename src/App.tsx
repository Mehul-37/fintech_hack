import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  UsersRound,
  GitBranch,
  FolderCheck,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Search,
  Check,
  Plus,
  SlidersHorizontal,
  Activity,
  Clock3,
  Wallet,
  Info,
  CircleHelp,
  ExternalLink,
  X,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react';
import { moneyEdgeTypes } from './MoneyEdge';
import { customers, detailedCustomers, dayOf, endOfDay } from './data';
import {
  assessContext,
  dateLabel,
  financialState,
  interventions,
  money,
  scoreProvider,
  thresholds,
  visibleEvents,
  visibleTransactions,
  highlightedEvents,
} from './engine';
import { createCase, loadCases, saveCases, updateCase } from './persistence';
import { InvestigationPanel } from './InvestigationPanel';
import { buildInvestigation } from './investigation';
import { modelVersion, transactionModelScore, expectedSalaryAt, repaymentHistoryAt } from './ml-inference';
import { riskLabel } from './format';
import type {
  CaseRecord,
  CaseStatus,
  Channel,
  Context,
  Customer,
  CustomerEvent,
  Intervention,
  Transaction,
} from './types';
import {
  Badge,
  Card,
  Empty,
  EventDay,
  PortfolioChart,
  RiskChart,
  Score,
  Sheet,
  contextClass,
} from './components';
import { PrototypeGuide } from './PrototypeGuide';
type Section = 'overview' | 'customer' | 'transactions' | 'cases';
const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'customer', label: 'Customer 360', icon: UsersRound },
  { id: 'transactions', label: 'Transactions & Network', icon: GitBranch },
  { id: 'cases', label: 'Cases & Actions', icon: FolderCheck },
] as const;
const contexts: Context[] = [
  'Healthy',
  'Suspected scam',
  'Possible scam-linked distress',
  'Organic distress',
  'Possible mule',
  'Uncertain / manual review',
];

function BrandIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M 22,34 L 22,78 L 22,46 C 22,35 30,32 38,32 C 48,32 51,38 51,48 L 51,78 L 51,46 C 51,35 59,32 67,32 C 77,32 80,38 80,48 L 80,78"
        stroke="currentColor"
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [section, setSection] = useState<Section>('overview');
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [day, setDay] = useState(24);
  const [playing, setPlaying] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [cases, setCases] = useState<CaseRecord[]>(() => {
    try {
      return loadCases(localStorage);
    } catch (e) {
      return [];
    }
  });
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CustomerEvent | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [toast, setToast] = useState('');
  const [help, setHelp] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const prevSectionRef = useRef<Section>('overview');
  const [transactionsTab, setTransactionsTab] = useState<'ledger' | 'network'>('ledger');

  const openGuide = () => {
    prevSectionRef.current = section;
    setPlaying(false);
    setGuideOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setSection(prevSectionRef.current);
  };

  const handlePrepareStep = (stepIndex: number) => {
    if (stepIndex >= 2 && stepIndex <= 6) {
      setCustomerId(customers[0].id);
      setDay(16);
      if (stepIndex === 6) {
        setTransactionsTab('network');
      }
    }
    if (stepIndex === 7) {
      if (cases.length > 0 && !selectedCase) {
        setSelectedCase(cases[0].id);
      }
    }
  };
  const [resetDialog, setResetDialog] = useState(false);
  const [introStage, setIntroStage] = useState<'blank' | 'letter' | 'morph' | 'done'>('blank');
  const [introMounted, setIntroMounted] = useState(true);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const brandMarkRef = useRef<HTMLSpanElement>(null);

  const measureTarget = () => {
    if (brandMarkRef.current) {
      const rect = brandMarkRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }
    }
  };

  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearIntroTimers = () => {
    introTimersRef.current.forEach((t) => clearTimeout(t));
    introTimersRef.current = [];
  };

  const runIntroSequence = () => {
    clearIntroTimers();
    setIntroMounted(true);
    setIntroStage('blank');
    // Stage 0: blank full-screen emerald (0-300ms)
    // Stage 1: letter 'm' traces in left-to-right (takes ~880ms)
    const t1 = setTimeout(() => setIntroStage('letter'), 300);
    // Stage 2: morph smoothly shrinks to exact brand badge position (1000ms duration)
    const t2 = setTimeout(() => {
      measureTarget();
      setIntroStage('morph');
    }, 1350);
    // Stage 3: morph complete, seamless crossfade with underlying brand mark
    const t3 = setTimeout(() => setIntroStage('done'), 2400);
    // Stage 4: unmount overlay safely
    const t4 = setTimeout(() => setIntroMounted(false), 2750);
    introTimersRef.current = [t1, t2, t3, t4];
  };

  useEffect(() => {
    if (introMounted) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [introMounted]);

  useEffect(() => {
    measureTarget();
    const frame = requestAnimationFrame(measureTarget);
    const timer = setTimeout(measureTarget, 100);
    runIntroSequence();
    window.addEventListener('resize', measureTarget);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      clearIntroTimers();
      window.removeEventListener('resize', measureTarget);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replayIntro = () => {
    measureTarget();
    runIntroSequence();
  };

  const c = customers.find((c) => c.id === customerId) ?? customers[0];
  const replayStops = useMemo(() => c.dataSource === 'generated-holdout'
    ? [1, 6, 12, 17, 20, 24].map((d) => ({ id: `${c.id}-REVIEW-${d}`, at: endOfDay(d),
        kind: 'baseline' as const, title: 'Scheduled history review', detail: 'Review the observations available at this checkpoint.' }))
    : c.events.filter((e) => dayOf(e.at) <= 24), [c]);
  const asOf = endOfDay(day);
  const f = financialState(c, asOf);
  const risk = scoreProvider.score(c, asOf);
  const assessment = assessContext(c, asOf, risk);
  const actions = interventions(c, asOf, assessment);
  const events = visibleEvents(c, asOf);
  const highlighted = highlightedEvents(c, asOf);
  const remainingEvidence = events.filter((e) => !highlighted.some((h) => h.id === e.id));
  useEffect(() => {
    try {
      loadCases(localStorage);
    } catch (e) {
      setStorageError(String(e));
    }
  }, []);
  useEffect(() => {
    if (!playing) return;
    const next = replayStops.find((e) => dayOf(e.at) > day);
    if (!next) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setDay(dayOf(next.at)), 1900);
    return () => clearTimeout(timer);
  }, [playing, day, replayStops]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  function persist(next: CaseRecord[]) {
    if (storageError && next.length > 0) {
      setToast('Resolve the saved-data error before creating or updating cases.');
      return false;
    }
    try {
      saveCases(localStorage, next);
      setCases(next);
      setStorageError('');
      return true;
    } catch (e) {
      setStorageError('Local storage is unavailable. Case changes could not be saved.');
      return false;
    }
  }
  function openCustomer(customer: Customer, reset = false) {
    setCustomerId(customer.id);
    setSection('customer');
    setPlaying(false);
    setSelectedEvent(null);
    setSelectedTx(null);
    if (reset) setDay(1);
  }
  function navigate(s: Section) {
    setSection(s);
    setPlaying(false);
    setSelectedEvent(null);
    setSelectedTx(null);
  }
  function makeCase(a: Intervention) {
    const result = createCase(cases, c, asOf, a, assessment);
    if (result.created) {
      try {
        result.record.investigation = buildInvestigation(result.record, c, customers);
        result.record.activity.push({
          at: result.record.investigation.generatedAt,
          text: `Local deterministic investigation report generated; reporter ${result.record.investigation.reporter}; score provider ${result.record.investigation.evidence.risk.providerVersion}; retrieval ${result.record.investigation.retrievalMs}ms, generation ${result.record.investigation.generationMs}ms. Human review required.`,
        });
      } catch {
        result.record.activity.push({
          at: new Date().toISOString(),
          text: 'Investigation report generation failed. The case is available for manual review; retry from the case detail.',
        });
      }
    }
    if (persist(result.cases)) {
      setToast(
        result.created
          ? 'Task created and saved locally. No banking action executed.'
          : 'Existing task opened. Duplicate creation prevented.',
      );
      setSelectedCase(result.record.id);
      setSection('cases');
      setPlaying(false);
    }
  }
  function mutateCase(record: CaseRecord, patch: Partial<CaseRecord>, message: string) {
    if (persist(cases.map((r) => (r.id === record.id ? updateCase(r, patch, message) : r))))
      setToast('Case updated and saved locally.');
  }
  const caseRecord = cases.find((r) => r.id === selectedCase);
  const morphStyle: React.CSSProperties =
    introStage === 'blank' || introStage === 'letter'
      ? {
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          borderRadius: '0px',
        }
      : {
          top: targetRect ? targetRect.top : 35,
          left: targetRect ? targetRect.left : 26,
          width: targetRect ? targetRect.width : 34,
          height: targetRect ? targetRect.height : 36,
          borderRadius: '9px',
        };

  return (
    <>
      {introMounted && (
        <div
          className={`intro-overlay stage-${introStage}`}
          style={morphStyle}
          aria-hidden="true"
        >
          <div className="intro-mark-wrapper">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="intro-trace-svg"
            >
              <path
                className="intro-trace-path"
                d="M 22,34 L 22,78 L 22,46 C 22,35 30,32 38,32 C 48,32 51,38 51,48 L 51,78 L 51,46 C 51,35 59,32 67,32 C 77,32 80,38 80,48 L 80,78"
                stroke="currentColor"
                strokeWidth="10.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
      <div className={`app-shell${sidebarOpen ? '' : ' sidebar-closed'} ${introMounted && (introStage === 'blank' || introStage === 'letter') ? 'intro-active' : ''}`}>
        <aside id="workspace-sidebar" className="sidebar" hidden={!sidebarOpen}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              replayIntro();
              navigate('overview');
            }}
            title="Click to replay intro animation"
          >
            <span
              ref={brandMarkRef}
              className="brand-mark"
              style={{
                opacity: introMounted && introStage !== 'done' ? 0 : 1,
                transition: 'opacity 0.25s ease',
              }}
              aria-label="Meridian brand mark"
            >
              <BrandIcon className="brand-logo-icon" />
              <span className="sr-only">m</span>
            </span>
            <span>
              meridian<span className="brand-sub">RISK WORKSPACE</span>
            </span>
          </a>
          <div className="nav-label">WORKSPACE</div>
          <nav aria-label="Main navigation">
            {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.id)}
              className={`nav-item ${section === n.id ? 'active' : ''}`}
              aria-current={section === n.id ? 'page' : undefined}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === 'cases' && cases.length > 0 && (
                <span className="nav-count">{cases.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item prototype-guide-btn" onClick={() => openGuide()}>
            <CircleHelp size={18} />
            Prototype guide
          </button>
          <div className="analyst">
            <span className="avatar">M</span>
            <div>
              <b>Mehul</b>
              <span>Risk analyst · Local workspace</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="workspace-sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} aria-hidden="true" />
            ) : (
              <PanelLeftOpen size={18} aria-hidden="true" />
            )}
          </button>
          <div className="breadcrumbs">
            Workspace <ChevronRight size={14} />
            <b>{nav.find((n) => n.id === section)?.label}</b>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="error-banner" role="alert">
              {storageError} <button onClick={() => setResetDialog(true)}>Reset saved cases</button>
            </div>
          )}
          {section === 'overview' && (
            <Overview
              day={day}
              cases={cases}
              onOpen={openCustomer}
              onCase={(id) => {
                setSelectedCase(id);
                navigate('cases');
              }}
              onReplay={() => openCustomer(customers[0], true)}
            />
          )}
          {section === 'customer' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CUSTOMER INTELLIGENCE / {c.id}</div>
                  <h1>
                    Customer 360<span className="heading-dot">.</span>
                  </h1>
                  <p>{c.dataSource === 'generated-holdout'
                    ? 'Synthetic August–September history · trained model estimates.'
                    : 'Synthetic comparison scenario · trained model estimates.'}</p>
                </div>
                <label className="select-label">
                  Demo customer
                  <select
                    aria-label="Demo customer"
                    value={c.id}
                    onChange={(e) => openCustomer(customers.find((c) => c.id === e.target.value)!)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.story ? ` · ${c.story}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="customer-layout">
                <div className="customer-main">
                  <Card className="customer-summary">
                    <span className="avatar large">
                      {c.name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')}
                    </span>
                    <div className="customer-identity">
                      <h2>{c.name}</h2>
                      <p>
                        {c.occupation} <span>·</span> {c.city} <span>·</span> {c.id}
                      </p>
                    </div>
                    <div className="summary-meta">
                      <span className="eyebrow">AS OF</span>
                      <b>{dateLabel(asOf)} 2026</b>
                      <small>End of day · IST</small>
                    </div>
                  </Card>
                  <div className="score-grid" data-guide="score-grid">
                    <Score
                      label="Scam Risk"
                      value={risk.scamScore}
                      baseline={scoreProvider.score(c, endOfDay(1)).scamScore}
                      color="coral"
                      caption={
                        risk.episode
                          ? `Open episode peak · observed ${dateLabel(risk.episode.observedAt)}`
                          : 'Trained model · observed payments only'
                      }
                    />
                    <Score
                      label="Repayment Risk"
                      value={risk.repaymentScore}
                      baseline={scoreProvider.score(c, endOfDay(1)).repaymentScore}
                      color="teal"
                      caption={`Seven-day delinquency estimate · synthetic-trained`}
                    />
                    <Card className="liquidity-score">
                      <div className="eyebrow">
                        <Wallet size={14} /> AVAILABLE BALANCE
                      </div>
                      <strong>{money(f.cash)}</strong>
                      <p>
                        {f.shortfall > 0 ? (
                          <>
                            <span className="coral">{money(f.shortfall)} forecast shortfall</span>{' '}
                            for EMI
                          </>
                        ) : (
                          <>
                            <span className="teal">EMI covered</span> by current funds
                          </>
                        )}
                      </p>
                      <small>After observed settled ledger entries</small>
                    </Card>
                  </div>
                  <Card className="timeline-card" data-guide="timeline-playback">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">SHARED CUSTOMER TIMELINE</span>
                        <h2>Risk over time</h2>
                      </div>
                      <span className="badge neutral">
                        <Clock3 size={13} />
                        As-of replay
                      </span>
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i className="legend-line coral" />
                        Scam Risk
                      </span>
                      <span>
                        <i className="legend-line teal dashed" />
                        Repayment Risk
                      </span>
                      <span><i className="legend-line amber" />Cash gap · % of EMI</span>
                      <span className="legend-note">Gap is ledger-derived</span>
                    </div>
                    <RiskChart customer={c} day={day} />
                    <div className="event-track">
                      {replayStops.map((e) => {
                        const observed = dayOf(e.at) <= day;
                        return (
                          <button
                            key={e.id}
                            className={`event-stop ${observed ? 'observed' : ''} ${dayOf(e.at) === day ? 'current' : ''}`}
                            onClick={() => {
                              setDay(dayOf(e.at));
                              setPlaying(false);
                            }}
                            aria-label={`Jump to day ${dayOf(e.at)}`}
                            title={observed ? e.title : 'Advance to reveal this observation'}
                          >
                            <span className="event-circle">
                              {!observed ? (
                                <Clock3 size={13} />
                              ) : e.kind === 'device' ? (
                                <ShieldCheck size={13} />
                              ) : e.kind === 'transfer' ? (
                                <ArrowUpRight size={14} />
                              ) : (
                                <Activity size={13} />
                              )}
                            </span>
                            <b>Day {dayOf(e.at)}</b>
                            <small>
                              {observed
                                ? c.dataSource === 'generated-holdout'
                                  ? 'History review'
                                  : e.title.includes('EMI')
                                  ? 'EMI before salary'
                                  : e.kind === 'transfer'
                                    ? 'Transfer activity'
                                    : e.kind === 'baseline'
                                      ? 'Stable baseline'
                                      : e.kind === 'device'
                                        ? 'New device'
                                        : e.kind === 'income'
                                          ? 'Income change'
                                          : e.kind === 'verification'
                                            ? 'Verification'
                                            : 'Liquidity update'
                                : 'Not yet observed'}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="playback">
                      <button
                        className="icon-button"
                        aria-label="Previous event"
                        disabled={day === 1}
                        onClick={() => {
                          setPlaying(false);
                          setDay(
                            [...replayStops].reverse().find((e) => dayOf(e.at) < day)
                              ? dayOf([...replayStops].reverse().find((e) => dayOf(e.at) < day)!.at)
                              : 1,
                          );
                        }}
                        title="Previous event"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="play-button"
                        onClick={() => {
                          if (day === 24) {
                            setDay(1);
                            setPlaying(true);
                          } else setPlaying(!playing);
                        }}
                        aria-label={playing ? 'Pause replay' : 'Play replay'}
                      >
                        {playing ? <Pause size={15} /> : <Play size={15} />}{' '}
                        {playing ? 'Pause' : 'Play story'}
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Next event"
                        disabled={day === 24}
                        onClick={() => {
                          setPlaying(false);
                          setDay(
                            dayOf(replayStops.find((e) => dayOf(e.at) > day)?.at ?? endOfDay(24)),
                          );
                        }}
                        title="Next event"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <input
                        aria-label="Timeline day"
                        type="range"
                        min={1}
                        max={24}
                        value={day}
                        onChange={(e) => {
                          setPlaying(false);
                          setDay(Number(e.target.value));
                        }}
                      />
                      <span className="playback-date">{dateLabel(asOf)}</span>
                      <button
                        className="reset-button"
                        onClick={() => {
                          setPlaying(false);
                          setDay(1);
                        }}
                        title="Reset playback only; saved cases are retained"
                      >
                        <RotateCcw size={14} />
                        Reset replay
                      </button>
                    </div>
                  </Card>
                  <div className="financial-grid">
                    <Card className="financial-card">
                      <div className="card-heading">
                        <h3>Financial state</h3>
                        <span className="mini muted">Baseline → as of {dateLabel(asOf)}</span>
                      </div>
                      <div className="financial-lines">
                        <div>
                          <span>Cash buffer</span>
                          <span>
                            <small>{money(financialState(c, endOfDay(1)).cash)}</small>
                            <ArrowRight size={12} />
                            <b>{money(f.cash)}</b>
                          </span>
                        </div>
                        <div>
                          <span>Credit utilization</span>
                          <span>
                            <small>{((c.openingCredit / c.creditLimit) * 100).toFixed(1)}%</small>
                            <ArrowRight size={12} />
                            <b>{f.utilization.toFixed(1)}%</b>
                          </span>
                        </div>
                        <div>
                          <span>Known essentials before EMI</span>
                          <b>{money(f.essentialsBeforeEmi)}</b>
                        </div>
                        <div>
                          <span>Funds available for EMI</span>
                          <b className={f.shortfall ? 'coral' : 'teal'}>{money(f.fundsForEmi)}</b>
                        </div>
                      </div>
                      <div className="financial-footnote">
                        Income {money(c.salary)} · recurring expense budget {money(c.expenses)}
                        <br />
                        Normal surplus after EMI: {money(c.salary - c.expenses - c.loan.emi)}.
                        Credit used: {money(f.creditUsed)} / {money(c.creditLimit)}.
                      </div>
                    </Card>
                    <Card className="loan-card">
                      <div className="card-heading">
                        <h3>Loan & repayment</h3>
                        <span className="badge neutral">{f.emiStatus}</span>
                      </div>
                      <div className="loan-amount">
                        <strong>{money(c.loan.emi)}</strong>
                        <span>EMI due {dateLabel(c.loan.dueAt)}</span>
                      </div>
                      <div className="loan-detail">
                        <span>Outstanding principal</span>
                        <b>{money(c.loan.principal)}</b>
                      </div>
                      <div className="loan-detail">
                        <span>Next expected salary</span>
                        <b>{dateLabel(expectedSalaryAt(c, asOf))}</b>
                      </div>
                      <div className="loan-detail">
                        <span>Days past due</span>
                        <b>{f.daysPastDue}</b>
                      </div>
                      <div className="repayment-history">
                        {repaymentHistoryAt(c, asOf).map((h) => (
                          <span key={h.month}>
                            <Check size={12} />
                            {h.month.split(' ')[0]} · {h.status}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
                <aside className="customer-context">
                  <Card className={`context-card context-${contextClass(assessment.context)}`} data-guide="context-card">
                    <div className="eyebrow">
                      <GitBranch size={14} /> CONTEXT ASSESSMENT
                    </div>
                    <Badge context={assessment.context} />
                    <h2>
                      {assessment.context === 'Possible scam-linked distress'
                        ? 'A loss today.\nRepayment pressure next.'
                        : assessment.context === 'Possible mule'
                          ? 'Follow the pass-through.'
                          : assessment.context === 'Organic distress'
                            ? 'An income gap,\nnot a scam signal.'
                            : assessment.context === 'Healthy'
                              ? 'A steady financial picture.'
                              : 'Verify before concluding.'}
                    </h2>
                    <p>{assessment.explanation}</p>
                    <div className="strength">
                      <ShieldCheck size={14} />
                      {assessment.strength}
                    </div>
                    <details>
                      <summary>
                        Alternative explanations <Plus size={13} />
                      </summary>
                      <p>{assessment.alternative}</p>
                    </details>
                    <div className="context-disclaimer">
                      Observed association · not proof of causation or guilt.
                    </div>
                  </Card>
                  <Card className="evidence-card">
                    <div className="card-heading">
                      <h3>Observed evidence</h3>
                      <span className="count-label">{events.length}</span>
                    </div>
                    <div className="evidence-chain">
                      {highlighted.map((e) => (
                        <button key={e.id} onClick={() => setSelectedEvent(e)}>
                          <EventDay date={e.at} />
                          <span>
                            <b>{e.title}</b>
                            <small>{e.id} · inspect evidence</small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                    {remainingEvidence.length > 0 && (
                      <details className="more-evidence" key={`${c.id}-${day}`}>
                        <summary>More observed evidence ({remainingEvidence.length})</summary>
                        <div className="evidence-chain">
                          {remainingEvidence.map((e) => (
                            <button key={e.id} onClick={() => setSelectedEvent(e)}>
                              <EventDay date={e.at} />
                              <span>
                                <b>{e.title}</b>
                                <small>{e.id} · inspect evidence</small>
                              </span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                        </div>
                      </details>
                    )}
                    <div className="mini muted">
                      Only observations available by {dateLabel(asOf)}.
                    </div>
                  </Card>
                  <Card className="actions-card" data-guide="actions-card">
                    <div className="card-heading">
                      <h3>Recommended response</h3>
                      <ArrowUpRight size={16} />
                    </div>
                    {actions.length ? (
                      actions.slice(0, 2).map((a) => (
                        <button className="recommendation" key={a.kind} onClick={() => makeCase(a)}>
                          <span className="action-icon">
                            <Plus size={14} />
                          </span>
                          <span>
                            <b>{a.title}</b>
                            <small>{a.detail}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      ))
                    ) : (
                      <div className="no-action">
                        <Check size={16} />
                        Continue routine monitoring.
                      </div>
                    )}
                    <>
                      {actions.length > 2 && (
                        <details className="more-actions">
                          <summary>Additional review tasks</summary>
                          {actions.slice(2).map((a) => (
                            <button
                              key={a.kind}
                              className="linked-transaction"
                              onClick={() => makeCase(a)}
                            >
                              <span>
                                {a.title}
                                <small>{a.detail}</small>
                              </span>
                              <Plus size={14} />
                            </button>
                          ))}
                        </details>
                      )}
                    </>
                    <p className="action-note">
                      Creates local review tasks. Approval and execution are separate.
                    </p>
                  </Card>
                </aside>
              </div>
            </>
          )}
          {section === 'transactions' && (
            <Transactions
              customer={c}
              day={day}
              onCustomer={(id) => {
                setCustomerId(id);
                setSelectedTx(null);
              }}
              onTx={setSelectedTx}
              activeTab={transactionsTab}
              onTabChange={setTransactionsTab}
            />
          )}
          {section === 'cases' && (
            <Cases
              cases={cases}
              selected={caseRecord}
              onSelect={setSelectedCase}
              onChange={mutateCase}
              onCustomer={openCustomer}
              onReset={() => setResetDialog(true)}
            />
          )}
          <footer>
            <span>
              <span className="live-dot" />
              Local prototype · deterministic synthetic records
            </span>
            <span>
              V2 / {modelVersion} <span className="footer-divider">|</span> No live banking
              connections
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      <Sheet
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? 'Event evidence'}
        description="Synthetic observed evidence · available in the selected as-of view."
      >
        {selectedEvent && (
          <>
            <div className="detail-banner">
              <EventDay date={selectedEvent.at} />
              <div>
                <b>{selectedEvent.id}</b>
                <p>
                  {new Date(selectedEvent.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
                  IST
                </p>
              </div>
            </div>
            <p className="detail-paragraph">{selectedEvent.detail}</p>
            <h3>Linked transactions</h3>
            {selectedEvent.transactionIds
              ?.map((id) => visibleTransactions(c, asOf).find((t) => t.id === id))
              .filter((t): t is Transaction => !!t)
              .map((t) => (
                <button
                  key={t.id}
                  className="linked-transaction"
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedTx(t);
                  }}
                >
                  <span>
                    {t.counterparty}
                    <small>
                      {t.id} · {t.channel}
                    </small>
                  </span>
                  <b>{money(t.amount)}</b>
                  <ExternalLink size={14} />
                </button>
              ))}
            {!selectedEvent.transactionIds && (
              <p className="muted">Session / context observation; no money movement attached.</p>
            )}
            <div className="notice">
              Observed-signal explanation, not a model attribution. Scam subtype: Unknown unless
              independently supported.
            </div>
          </>
        )}
      </Sheet>
      <Sheet
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={
          selectedTx
            ? `${money(selectedTx.amount)} ${selectedTx.direction === 'out' ? 'outgoing' : 'incoming'}`
            : 'Transaction'
        }
        description="Synthetic transaction record · no payment execution controls."
      >
        {selectedTx && <TransactionDetail customer={c} transaction={selectedTx} />}
      </Sheet>
      <PrototypeGuide
        open={guideOpen}
        onClose={closeGuide}
        onNavigateSection={(s) => setSection(s)}
        onPrepareStep={handlePrepareStep}
      />
      <Sheet
        open={help}
        onClose={() => setHelp(false)}
        title="Workspace guide"
        description="Prototype guide · V2 models"
      >
        <div className="guide-chain">
          <span>Suspicious event</span>
          <ArrowRight />
          <span>Financial shock</span>
          <ArrowRight />
          <span>Repayment pressure</span>
        </div>
        <p>
          Use Overview to open a customer, then replay their September history. Both scores, the
          ledger, context and recommendations follow the same as-of cursor.
        </p>
        <h3>Five comparison stories</h3>
        {detailedCustomers.map((c) => (
          <button
            key={c.id}
            className="linked-transaction"
            onClick={() => {
              setHelp(false);
              openCustomer(c, true);
            }}
          >
            <span>
              {c.name}
              <small>{c.story}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
        <h3>Data & models</h3>
        <p>
          Two histogram-boosted models trained on 2,000 synthetic customers produce the scores.
          Repayment estimates an unpaid EMI balance seven days after due; scam shows the peak of
          observed transaction estimates. These estimates are not validated for real customers. The
          ledger, context rules and saved cases are functional. No messages, holds, recovery or debt
          changes are executed.
        </p>
        <h3>Reset controls</h3>
        <p>
          Reset replay moves time to day 1 and keeps saved cases. Reset saved cases in Cases &
          Actions deletes this browser’s case data after confirmation.
        </p>
      </Sheet>
      <Sheet
        open={resetDialog}
        onClose={() => setResetDialog(false)}
        title="Reset saved case data?"
        description="This deletes every local case, note, contact result and activity entry. Playback and synthetic customer histories are unaffected."
      >
        <p>This action cannot be undone within the prototype.</p>
        <button
          className="danger-button"
          onClick={() => {
            if (persist([])) {
              setSelectedCase(null);
              setResetDialog(false);
              setToast('Saved case data cleared. Playback is unchanged.');
            }
          }}
        >
          <Trash2 size={16} />
          Delete all saved cases
        </button>
        <button className="secondary-button" onClick={() => setResetDialog(false)}>
          Keep saved cases
        </button>
      </Sheet>
    </div>
    </>
  );
}

function Overview({
  day,
  cases,
  onOpen,
  onCase,
  onReplay,
}: {
  day: number;
  cases: CaseRecord[];
  onOpen: (c: Customer) => void;
  onCase: (id: string) => void;
  onReplay: () => void;
}) {
  const [search, setSearch] = useState('');
  const [context, setContext] = useState('all');
  const [band, setBand] = useState('all');
  const [channel, setChannel] = useState('all');
  const [review, setReview] = useState('all');
  const [queuePage, setQueuePage] = useState(1);
  useEffect(() => setQueuePage(1), [search, context, band, channel, review, day]);
  const rows = customers
    .map((customer) => {
      const r = scoreProvider.score(customer, endOfDay(day));
      return {
        customer,
        scam: r.scamScore,
        repayment: r.repaymentScore,
        context: assessContext(customer, endOfDay(day), r).context,
      };
    })
    .sort((a, b) => Math.max(b.scam, b.repayment) - Math.max(a.scam, a.repayment));
  const filtered = rows.filter(
    (r) =>
      (r.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        r.customer.id.toLowerCase().includes(search.toLowerCase())) &&
      (context === 'all' || r.context === context) &&
      (band === 'all' ||
        (band === 'high'
          ? Math.max(r.scam, r.repayment) >= 60
          : Math.max(r.scam, r.repayment) < 60)) &&
      (channel === 'all' ||
        visibleTransactions(r.customer, endOfDay(day)).some((t) => t.channel === channel)) &&
      (review === 'all' ||
        cases.some((c) => c.customerId === r.customer.id && c.status !== 'Resolved')),
  );
  const metrics = [
    {
      label: 'Customers monitored',
      value: customers.length,
      detail: 'Synthetic portfolio',
      icon: UsersRound,
    },
    {
      label: 'Active scam alerts',
      value: rows.filter((r) => r.scam >= thresholds.scamAlert).length,
      detail: `Scam episode peak ≥ ${Number(thresholds.scamAlert.toFixed(1))} · role unconfirmed`,
      icon: ShieldCheck,
    },
    {
      label: 'Repayment warnings',
      value: rows.filter((r) => r.repayment >= thresholds.repaymentWarning).length,
      detail: `Seven-day estimate ≥ ${Number(thresholds.repaymentWarning.toFixed(1))}`,
      icon: Activity,
    },
    {
      label: 'Possible linked distress',
      value: rows.filter((r) => r.context === 'Possible scam-linked distress').length,
      detail: 'Linked signals · cause unconfirmed',
      icon: GitBranch,
    },
  ];
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(queuePage, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PORTFOLIO INTELLIGENCE</div>
          <h1>
            Portfolio overview<span className="heading-dot">.</span>
          </h1>
          <p>Review scam and repayment risk across the portfolio.</p>
        </div>
        <div className="heading-actions">
          <span className="date-chip">As of {dateLabel(endOfDay(day))} 2026</span>
          <button className="primary-button" onClick={onReplay}>
            <Play size={15} />
            Replay Arjun’s timeline
          </button>
        </div>
      </div>
      <div className="metric-grid">
        {metrics.map((m) => (
          <Card key={m.label} className="metric-card">
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon size={17} />
            </div>
            <strong>{m.value.toString().padStart(2, '0')}</strong>
            <p>{m.detail}</p>
          </Card>
        ))}
      </div>
      <div className="overview-grid">
        <Card className="portfolio-card" data-guide="portfolio-map">
          <div className="card-heading">
            <div>
              <span className="eyebrow">DUAL-RISK MAP</span>
              <h2>Risk distribution</h2>
            </div>
            <span className="mini muted">Select a customer to investigate</span>
          </div>
          <PortfolioChart rows={filtered} onOpen={onOpen} />
          <div className="scatter-legend">
            {[
              'Healthy',
              'Possible scam-linked distress',
              'Organic distress',
              'Possible mule',
              'Uncertain / manual review',
            ].map((c) => (
              <span key={c}>
                <i className={contextClass(c as Context)} />
                {c === 'Possible scam-linked distress'
                  ? 'Scam-linked distress'
                  : c === 'Uncertain / manual review'
                    ? 'Manual review'
                    : c}
              </span>
            ))}
          </div>
        </Card>
        <Card className="story-card">
          <span className="eyebrow">FEATURED INVESTIGATION</span>
          <span className="story-number">01 / 05</span>
          <h2>
            Suspicious outflow.
            <br />
            Repayment shortfall.
          </h2>
          <p>How Arjun’s outflow reduced his EMI buffer.</p>
          <div className="story-flow">
            <span>
              <ShieldCheck size={17} />
              Event
            </span>
            <ArrowRight size={14} />
            <span>
              <Wallet size={17} />
              Impact
            </span>
            <ArrowRight size={14} />
            <span>
              <FolderCheck size={17} />
              Action
            </span>
          </div>
          <button onClick={onReplay}>
            View Arjun’s timeline <ArrowUpRight size={18} />
          </button>
          <div className="pattern-summary">
            <span>OBSERVED PATTERNS</span>
            <p>
              {rows.filter((r) => r.context === 'Possible mule').length} pass-through pattern ·{' '}
              {rows.filter((r) => r.context === 'Organic distress').length} income interruption
            </p>
            <small>Categories overlap across the portfolio.</small>
          </div>
        </Card>
      </div>
      <Card className="queue-card" data-guide="attention-queue">
        <div className="card-heading">
          <div>
            <span className="eyebrow">PRIORITIZED REVIEW</span>
            <h2>
              Attention queue <span className="count-label">{filtered.length}</span>
            </h2>
          </div>
          <span className="mini muted">Highest observed risk first</span>
        </div>
        <div className="filters">
          <div className="search-field">
            <Search size={15} />
            <input
              aria-label="Search customers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers or ID…"
            />
          </div>
          <SlidersHorizontal size={15} />
          <select
            aria-label="Filter context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          >
            <option value="all">All contexts</option>
            {contexts.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter score band"
            value={band}
            onChange={(e) => setBand(e.target.value)}
          >
            <option value="all">All risk bands</option>
            <option value="high">High · 60+</option>
            <option value="low">Below 60</option>
          </select>
          <select
            aria-label="Filter payment channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="all">All channels</option>
            {['UPI', 'Wallet', 'Card', 'Digital banking'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter review status"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          >
            <option value="all">All review states</option>
            <option value="open">Open review</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Scam Risk</th>
                <th>Repayment Risk</th>
                <th>Context</th>
                <th>Next EMI</th>
                <th>Review / next step</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const saved = cases.find((c) => c.customerId === r.customer.id);
                const action = interventions(r.customer, endOfDay(day))[0];
                return (
                  <tr key={r.customer.id}>
                    <td>
                      <button className="customer-cell" onClick={() => onOpen(r.customer)}>
                        <span className="avatar small">
                          {r.customer.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                        <span>
                          <b>{r.customer.name}</b>
                          <small>{r.customer.id}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <b className={r.scam >= thresholds.scamAlert ? 'coral' : ''}>{riskLabel(r.scam)}</b>
                      <small className="table-delta">
                        {r.scam - scoreProvider.score(r.customer, endOfDay(1)).scamScore >= 0
                          ? '+'
                          : ''}
                        {(r.scam - scoreProvider.score(r.customer, endOfDay(1)).scamScore).toFixed(1)}
                      </small>
                    </td>
                    <td>
                      <b className={r.repayment >= thresholds.repaymentWarning ? 'teal' : ''}>
                        {riskLabel(r.repayment)}
                      </b>
                      <small className="table-delta">
                        {r.repayment -
                          scoreProvider.score(r.customer, endOfDay(1)).repaymentScore >=
                        0
                          ? '+'
                          : ''}
                        {(r.repayment - scoreProvider.score(r.customer, endOfDay(1)).repaymentScore).toFixed(1)}
                      </small>
                    </td>
                    <td>
                      <Badge context={r.context} />
                    </td>
                    <td>
                      <b>{money(r.customer.loan.emi)}</b>
                      <small className="block">{dateLabel(r.customer.loan.dueAt)}</small>
                    </td>
                    <td>
                      {saved ? (
                        <button className="text-button" onClick={() => onCase(saved.id)}>
                          {saved.status} · {saved.id}
                          <ExternalLink size={12} />
                        </button>
                      ) : (
                        <span className="next-step">{action?.title ?? 'Routine monitoring'}</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Open ${r.customer.name} customer record`}
                        onClick={() => onOpen(r.customer)}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="queue-pagination">
            <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} customers</span>
            {pageCount > 1 && <div>
              <button className="secondary-button" aria-label="Previous customer page"
                disabled={currentPage === 1} onClick={() => setQueuePage(currentPage - 1)}>
                <ChevronLeft size={14} /> Previous
              </button>
              <span>Page {currentPage} / {pageCount}</span>
              <button className="secondary-button" aria-label="Next customer page"
                disabled={currentPage === pageCount} onClick={() => setQueuePage(currentPage + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>}
          </div>
        )}
        {!filtered.length && (
          <Empty
            title="No matching customers"
            detail="Try another search or broaden the filters."
          />
        )}
      </Card>
    </>
  );
}

function TransactionDetail({
  customer: c,
  transaction: t,
}: {
  customer: Customer;
  transaction: Transaction;
}) {
  const settled = c.transactions.filter(
    (x) => x.status === 'Completed' && Date.parse(x.at) < Date.parse(t.at),
  );
  const before =
    c.openingCash + settled.reduce((n, x) => n + (x.direction === 'in' ? x.amount : -x.amount), 0);
  const after =
    t.status === 'Completed' ? before + (t.direction === 'in' ? t.amount : -t.amount) : before;
  return (
    <>
      <div className="detail-banner">
        <span className="avatar">
          <ArrowUpRight size={20} />
        </span>
        <div>
          <b>{t.counterparty}</b>
          <p>
            {t.id} · {t.channel} · {t.status}
          </p>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Observed at</dt>
          <dd>{new Date(t.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</dd>
        </div>
        <div>
          <dt>Usual transfer size</dt>
          <dd>{money(c.usualTransfer)}</dd>
        </div>
        <div>
          <dt>Observed / usual size</dt>
          <dd>{(t.amount / c.usualTransfer).toFixed(1)}×</dd>
        </div>
        <div>
          <dt>Beneficiary</dt>
          <dd>{t.newBeneficiary ? 'First-seen' : 'Known / routine'}</dd>
        </div>
        <div>
          <dt>Device</dt>
          <dd>{t.unusualDevice ? 'Unusual device observed' : 'No unusual-device signal'}</dd>
        </div>
        <div>
          <dt>Balance before</dt>
          <dd>{money(before)}</dd>
        </div>
        <div>
          <dt>Balance after</dt>
          <dd>{money(after)}</dd>
        </div>
        <div>
          <dt>Transaction score</dt>
          <dd>{transactionModelScore(c, t)} / 100 · synthetic-trained ML</dd>
        </div>
        <div>
          <dt>Suspected subtype</dt>
          <dd>Unknown</dd>
        </div>
      </dl>
      <h3>Observed signals</h3>
      {t.signals.length ? (
        t.signals.map((s) => (
          <span key={s} className="signal-chip">
            {s}
          </span>
        ))
      ) : (
        <p className="muted">No unusual pattern signal in this transaction.</p>
      )}
      <div className="notice">
        {t.status === 'Completed'
          ? 'This transfer is completed. Investigation, recovery review and future-payment review remain recommendations. It cannot be held retroactively.'
          : 'Pending synthetic instruction. No real payment is held or executed by this prototype.'}
      </div>
    </>
  );
}

function Transactions({
  customer: c,
  day,
  onCustomer,
  onTx,
  activeTab = 'ledger',
  onTabChange,
}: {
  customer: Customer;
  day: number;
  onCustomer: (id: string) => void;
  onTx: (t: Transaction) => void;
  activeTab?: 'ledger' | 'network';
  onTabChange?: (tab: 'ledger' | 'network') => void;
}) {
  const [internalTab, setInternalTab] = useState<'ledger' | 'network'>(activeTab);
  const tab = onTabChange ? activeTab : internalTab;
  const setTab = (t: 'ledger' | 'network') => {
    setInternalTab(t);
    onTabChange?.(t);
  };
  const [channel, setChannel] = useState('all');
  const [direction, setDirection] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const ts = visibleTransactions(c, endOfDay(day));
  const filtered = ts.filter(
    (t) =>
      (channel === 'all' || t.channel === channel) &&
      (direction === 'all' || t.direction === direction) &&
      (t.counterparty.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())),
  );
  const transfers = ts.filter((t) => t.category === 'transfer');
  const flow = useMemo(() => {
    const accounts = [...new Set(transfers.map((t) => t.account))];
    const nodes: Node[] = [
      {
        id: c.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        ariaLabel: `Inspect account ${c.name}`,
        position: { x: 340, y: 145 },
        data: {
          label: (
            <div>
              <b>{c.name}</b>
              <small>Focal account · {c.id}</small>
            </div>
          ),
        },
        className: 'focal-node',
      },
    ];
    accounts.forEach((account, i) => {
      const t = transfers.find((t) => t.account === account)!;
      const incoming = t.direction === 'in';
      nodes.push({
        id: account,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        ariaLabel: `Inspect account ${t.counterparty}`,
        position: { x: incoming ? 20 : 665, y: accounts.length === 1 ? 145 : 30 + i * 95 },
        data: {
          label: (
            <div>
              <b>{t.counterparty}</b>
              <small>{incoming ? 'Source account' : 'Recipient account'}</small>
            </div>
          ),
        },
        className: incoming ? 'sender-node' : 'recipient-node',
      });
    });
    const edges: Edge[] = transfers.map((t, index) => ({
      id: t.id,
      type: 'money',
      data: {
        bend:
          transfers.filter((x) => x.account === t.account).length > 1
            ? index % 2 === 0
              ? -55
              : 55
            : 0,
      },
      ariaLabel: `Inspect transfer ${t.id}: ${money(t.amount)}`,
      source: t.direction === 'in' ? t.account : c.id,
      target: t.direction === 'in' ? c.id : t.account,
      label: `${money(t.amount)} · ${t.at.slice(11, 16)}`,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8c9e94' },
      style: {
        stroke: transactionModelScore(c, t) >= thresholds.scamAlert ? '#ba6851' : '#6a897c',
        strokeWidth: 2,
      },
      labelStyle: { fontSize: 11, fill: '#394d44' },
      labelBgPadding: [8, 5],
      labelBgBorderRadius: 4,
    }));
    return { nodes, edges };
  }, [c, day]);
  useEffect(() => setSelectedNode(null), [c.id, day]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MONEY MOVEMENT / {c.id}</div>
          <h1>
            Follow the evidence<span className="heading-dot">.</span>
          </h1>
          <p>Review transactions and account connections.</p>
        </div>
        <label className="select-label">
          Selected customer
          <select
            aria-label="Transactions customer"
            value={c.id}
            onChange={(e) => onCustomer(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scope-bar">
        <span className="avatar small">
          {c.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </span>
        <b>{c.name}</b>
        <Badge context={assessContext(c, endOfDay(day)).context} />
        <span className="scope-date">
          As of {dateLabel(endOfDay(day))} · future transactions hidden
        </span>
      </div>
      <div className="tabs" role="tablist" aria-label="Evidence views">
        <button role="tab" aria-selected={tab === 'ledger'} onClick={() => setTab('ledger')}>
          Transaction ledger <span>{ts.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'network'} onClick={() => setTab('network')}>
          Money-flow network <GitBranch size={15} />
        </button>
      </div>
      {tab === 'ledger' ? (
        <Card>
          <div className="filters">
            <div className="search-field">
              <Search size={15} />
              <input
                aria-label="Search transactions"
                placeholder="Search counterparty or transaction…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Transaction channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="all">All payment channels</option>
              {['UPI', 'Wallet', 'Card', 'Digital banking'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Transaction direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="all">All directions</option>
              <option value="in">Incoming</option>
              <option value="out">Outgoing</option>
            </select>
            <span className="mini muted">{filtered.length} observed records</span>
          </div>
          <div className="table-wrap">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Timestamp · IST</th>
                  <th>Counterparty</th>
                  <th>Channel</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Transaction risk</th>
                  <th>Observed signals</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{dateLabel(t.at)}</b>
                      <small className="block">
                        {t.at.slice(11, 16)} · {t.id}
                      </small>
                    </td>
                    <td>
                      <button className="text-button" onClick={() => onTx(t)}>
                        {t.counterparty}
                      </button>
                      <small className="block">
                        {t.direction === 'in' ? 'Incoming' : 'Outgoing'} · {t.category}
                      </small>
                    </td>
                    <td>{t.channel}</td>
                    <td>
                      <b className={t.direction === 'in' ? 'teal' : ''}>
                        {t.direction === 'in' ? '+' : '−'}
                        {money(t.amount)}
                      </b>
                    </td>
                    <td>
                      <span className="badge neutral">{t.status}</span>
                    </td>
                    <td>
                      <b
                        className={
                          transactionModelScore(c, t) >= thresholds.scamAlert ? 'coral' : ''
                        }
                      >
                        {transactionModelScore(c, t)}
                      </b>
                      <small className="table-delta">Trained ML</small>
                    </td>
                    <td className="signal-cell">{t.signals.join(' · ') || 'Routine record'}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Inspect ${t.id}`}
                        onClick={() => onTx(t)}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <Empty
              title="No matching transactions"
              detail="Change the filters or advance the customer timeline."
            />
          )}
        </Card>
      ) : (
        <>
          <Card className="network-card" data-guide="network-panel">
            <div className="card-heading">
              <div>
                <span className="eyebrow">OBSERVED TRANSACTION RELATIONSHIPS</span>
                <h2>
                  {assessContext(c, endOfDay(day)).context === 'Possible mule'
                    ? 'Fan-in → rapid onward flow'
                    : 'Outgoing funds, visible connections'}
                </h2>
              </div>
              <span className="mini muted">Click an edge or account to inspect</span>
            </div>
            {transfers.length ? (
              <div className="flow-canvas">
                <ReactFlow
                  nodes={flow.nodes}
                  edges={flow.edges}
                  edgeTypes={moneyEdgeTypes}
                  edgesFocusable
                  nodesFocusable
                  fitView
                  minZoom={0.4}
                  maxZoom={1.5}
                  nodesDraggable={false}
                  onEdgeClick={(_, edge) => onTx(transfers.find((t) => t.id === edge.id)!)}
                  onNodeClick={(_, node) => setSelectedNode(node.id)}
                  proOptions={{ hideAttribution: false }}
                >
                  <Background color="#d7e2da" gap={20} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
            ) : (
              <Empty
                title="No transfer relationships observed"
                detail="Routine essential payments do not establish an account-transfer network. Advance the replay or compare another story."
              />
            )}
          </Card>
          <div className="network-bottom">
            <Card>
              <h3>How to read this network</h3>
              <p>
                Edges represent observed synthetic money transfers, with amount and time in IST. No
                shared-device or shared-IP edges are inferred.
              </p>
              <div className="notice">
                An outgoing loss differs from several senders funding rapid onward transfers. A
                connection alone is not proof of collusion.
              </div>
            </Card>
            <Card>
              <h3>{selectedNode ? 'Selected account evidence' : 'Account inspection'}</h3>
              {selectedNode ? (
                <>
                  <p>
                    <b>
                      {selectedNode === c.id
                        ? c.name
                        : transfers.find((t) => t.account === selectedNode)?.counterparty}
                    </b>
                  </p>
                  {transfers
                    .filter((t) => selectedNode === c.id || t.account === selectedNode)
                    .map((t) => (
                      <button key={t.id} className="linked-transaction" onClick={() => onTx(t)}>
                        <span>
                          {t.id} · {t.direction === 'in' ? 'Incoming' : 'Outgoing'}
                          <small>
                            {t.at.slice(11, 16)} IST · {t.status}
                          </small>
                        </span>
                        <b>{money(t.amount)}</b>
                      </button>
                    ))}
                </>
              ) : (
                <>
                  <p className="muted">
                    Select an account or inspect a transfer below. Recipient identity is synthetic
                    and unverified.
                  </p>
                  {transfers.map((t) => (
                    <button key={t.id} className="linked-transaction" onClick={() => onTx(t)}>
                      <span>
                        {t.id} · {t.direction === 'in' ? 'Incoming' : 'Outgoing'}
                        <small>
                          {t.at.slice(11, 16)} IST · {t.status}
                        </small>
                      </span>
                      <b>{money(t.amount)}</b>
                    </button>
                  ))}
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Cases({
  cases,
  selected,
  onSelect,
  onChange,
  onCustomer,
  onReset,
}: {
  cases: CaseRecord[];
  selected?: CaseRecord;
  onSelect: (id: string) => void;
  onChange: (c: CaseRecord, p: Partial<CaseRecord>, message: string) => void;
  onCustomer: (c: Customer) => void;
  onReset: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [followup, setFollowup] = useState('');
  const [disposition, setDisposition] = useState('');
  const selectedCustomer = selected && customers.find((c) => c.id === selected.customerId);
  useEffect(() => {
    setNote('');
    setError('');
    setFollowup(selected?.followUp ?? '');
    setDisposition(selected?.disposition ?? '');
  }, [selected?.id]);
  const list = cases.filter((c) => filter === 'all' || c.status === filter);
  function statusChange(status: CaseStatus) {
    if (!selected) return;
    if (status === 'Resolved' && !disposition.trim()) {
      setError('Choose a disposition before resolving this case.');
      return;
    }
    setError('');
    onChange(
      selected,
      {
        status,
        ...(status === 'Resolved'
          ? { disposition, reviewedBy: selected.owner, reviewedAt: new Date().toISOString() }
          : {}),
      },
      `Status changed to ${status}${status === 'Resolved' ? `; disposition: ${disposition}` : ''}.`,
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HUMAN REVIEW & ACCOUNTABILITY</div>
          <h1>
            From insight to action<span className="heading-dot">.</span>
          </h1>
          <p>Review tasks, follow-ups and activity.</p>
        </div>
        <button className="secondary-button" onClick={onReset}>
          <RotateCcw size={14} />
          Reset saved cases
        </button>
      </div>
      <div className="case-summary">
        <span>
          <b>{cases.filter((c) => c.status !== 'Resolved').length}</b> active tasks
        </span>
        <span>
          <b>{cases.filter((c) => c.status === 'Awaiting customer').length}</b> awaiting customer
        </span>
        <span>
          <b>{cases.filter((c) => c.status === 'Resolved').length}</b> resolved
        </span>
        <span className="local-save">
          <Check size={13} />
          Saved in this browser
        </span>
      </div>
      <div className="cases-layout" data-guide="case-workspace">
        <Card className="case-queue">
          <div className="card-heading">
            <h3>Case queue</h3>
            <select
              aria-label="Case status filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {['Open', 'In review', 'Awaiting customer', 'Resolved'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {list.map((record) => (
            <button
              key={record.id}
              className={`case-row ${selected?.id === record.id ? 'selected' : ''}`}
              onClick={() => onSelect(record.id)}
            >
              <div>
                <span>{record.id}</span>
                <span className="badge neutral">{record.status}</span>
              </div>
              <h3>{record.title}</h3>
              <p>
                {customers.find((c) => c.id === record.customerId)?.name
                  ?? record.investigation?.evidence.customerName ?? record.customerId} <span>·</span>{' '}
                {record.priority} priority
              </p>
              <small>
                {record.owner} ·{' '}
                {record.followUp ? `Follow-up ${record.followUp}` : 'Follow-up not scheduled'}
              </small>
            </button>
          ))}
          {!list.length && (
            <Empty
              title={cases.length ? 'No cases in this status' : 'Your review queue is clear'}
              detail={
                cases.length
                  ? 'Choose another status filter.'
                  : 'Open Customer 360 and create a task from a recommended response.'
              }
            />
          )}
        </Card>
        {selected ? (
          <Card className="case-detail">
            <div className="card-heading">
              <div>
                <span className="eyebrow">
                  {selected.id} / {selected.kind.toUpperCase()}
                </span>
                <h2>{selected.title}</h2>
              </div>
              <button
                className="text-button"
                disabled={!selectedCustomer}
                title={selectedCustomer ? 'Open current customer history' : 'Original customer history is outside the current demo portfolio'}
                onClick={() => selectedCustomer && onCustomer(selectedCustomer)}
              >
                Customer 360 <ArrowUpRight size={14} />
              </button>
            </div>
            {!selectedCustomer && (
              <p className="report-notice">
                This case belongs to an earlier demo history. Its captured evidence, report and notes
                remain saved; that history is outside the current customer portfolio.
              </p>
            )}
            <div className="case-fields">
              <label>
                Status
                <select
                  aria-label="Case status"
                  value={selected.status}
                  onChange={(e) => statusChange(e.target.value as CaseStatus)}
                >
                  {['Open', 'In review', 'Awaiting customer', 'Resolved'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select
                  aria-label="Case owner"
                  value={selected.owner}
                  onChange={(e) =>
                    onChange(selected, { owner: e.target.value }, `Assigned to ${e.target.value}.`)
                  }
                >
                  <option>A. Sen</option>
                  <option>Fraud review team</option>
                  <option>Repayment review team</option>
                </select>
              </label>
              <label>
                Disposition
                <select
                  aria-label="Case disposition"
                  value={disposition}
                  onChange={(e) => {
                    setDisposition(e.target.value);
                    onChange(
                      selected,
                      {
                        disposition: e.target.value,
                        reviewedBy: e.target.value ? selected.owner : undefined,
                        reviewedAt: e.target.value ? new Date().toISOString() : undefined,
                      },
                      `Disposition recorded: ${e.target.value || 'Not selected'}.`,
                    );
                  }}
                >
                  <option value="">Select on resolution</option>
                  <option>Review complete · no execution</option>
                  <option>Insufficient evidence</option>
                  <option>Customer report recorded</option>
                  <option>Escalated for assessment</option>
                  <option>Confirmed fraud · human assessment</option>
                  <option>Suspicious · continue monitoring</option>
                  <option>False positive · human assessment</option>
                  <option>Requires customer verification</option>
                </select>
              </label>
            </div>
            {selected.reviewedBy && selected.reviewedAt && (
              <p className="mini muted">
                Human disposition recorded by {selected.reviewedBy} ·{' '}
                {new Date(selected.reviewedAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })}{' '}
                IST
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="case-evidence">
              <span className="eyebrow">
                CAPTURED EVIDENCE · AS OF {dateLabel(selected.evidenceAsOf).toUpperCase()}
              </span>
              <p>{selected.explanation}</p>
              <div>
                {selected.evidenceIds.map((id) => (
                  <span className="signal-chip" key={id}>
                    {id}
                  </span>
                ))}
              </div>
              <small>Saved case snapshot; it does not alter replay history or scores.</small>
            </div>
            <InvestigationPanel key={selected.id} record={selected} onChange={onChange} />
            <div className="case-two-col">
              <section>
                <h3>Review checklist</h3>
                {[
                  'Review available evidence',
                  'Verify customer / source of funds',
                  'Record next review step',
                ].map((item) => (
                  <label key={item} className="check-row">
                    <input
                      type="checkbox"
                      checked={selected.checklist.includes(item)}
                      onChange={(e) =>
                        onChange(
                          selected,
                          {
                            checklist: e.target.checked
                              ? [...selected.checklist, item]
                              : selected.checklist.filter((s) => s !== item),
                          },
                          `${e.target.checked ? 'Completed' : 'Reopened'} checklist: ${item}.`,
                        )
                      }
                    />
                    {item}
                  </label>
                ))}
              </section>
              <section>
                <h3>Follow-up</h3>
                <label className="mini muted" htmlFor="followup">
                  Next review date
                </label>
                <div className="followup-form">
                  <input
                    id="followup"
                    aria-label="Follow-up date"
                    type="date"
                    value={followup}
                    onInput={(e) => setFollowup(e.currentTarget.value)}
                    onChange={(e) => setFollowup(e.target.value)}
                  />
                  <button
                    className="secondary-button"
                    onClick={() => {
                      if (!followup) {
                        setError('Choose a follow-up date.');
                        return;
                      }
                      if (followup < selected.createdAt.slice(0, 10)) {
                        setError('Follow-up date must be on or after case creation.');
                        return;
                      }
                      setError('');
                      onChange(
                        selected,
                        { followUp: followup },
                        `Follow-up scheduled for ${followup}.`,
                      );
                    }}
                  >
                    Save
                  </button>
                </div>
              </section>
            </div>
            <label className="contact-label">
              Customer-contact outcome
              <select
                aria-label="Customer contact outcome"
                value={selected.contactOutcome}
                onChange={(e) =>
                  onChange(
                    selected,
                    { contactOutcome: e.target.value },
                    `Customer-contact outcome recorded: ${e.target.value}.`,
                  )
                }
              >
                <option>Not contacted</option>
                <option>Contact attempted · no response</option>
                <option>Customer initiated payment · legitimacy unconfirmed</option>
                <option>Customer reports suspected deception</option>
                <option>Customer reports legitimate purpose · unverified</option>
                <option>Purpose and beneficiary independently verified</option>
              </select>
            </label>
            <p className="mini muted">
              Records an analyst-entered outcome. The prototype does not contact the customer.
            </p>
            <div className="notes-section">
              <h3>Analyst notes</h3>
              <label className="sr-only" htmlFor="note">
                Analyst note
              </label>
              <textarea
                id="note"
                placeholder="Record observations, uncertainty, or a next step…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
              />
              <div className="note-actions">
                <span className="mini muted">{note.length}/2000 · stored locally</span>
                <button
                  className="primary-button"
                  onClick={() => {
                    if (!note.trim()) {
                      setError('Enter a note before saving.');
                      return;
                    }
                    setError('');
                    onChange(
                      selected,
                      {
                        notes: [
                          ...selected.notes,
                          { at: new Date().toISOString(), text: note.trim() },
                        ],
                      },
                      `Analyst note added: ${note.trim()}`,
                    );
                    setNote('');
                  }}
                >
                  <Plus size={14} />
                  Add note
                </button>
              </div>
              {selected.notes.map((n, i) => (
                <div key={i} className="saved-note">
                  <b>A. Sen</b>
                  <small>
                    {new Date(n.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </small>
                  <p>{n.text}</p>
                </div>
              ))}
            </div>
            <div className="activity-log">
              <h3>Timestamped activity</h3>
              {[...selected.activity].reverse().map((a, i) => (
                <div key={i}>
                  <span className="activity-dot" />
                  <p>
                    {a.text}
                    <small>
                      {new Date(a.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </small>
                  </p>
                </div>
              ))}
            </div>
            <div className="notice">
              A support request does not forgive debt, approve restructuring, reduce a risk score,
              or deliver a message. These are review tasks.
            </div>
          </Card>
        ) : (
          <Card className="case-placeholder">
            <Empty
              title="Choose a case to review"
              detail="Saved evidence, notes, contact outcomes and the activity trail appear here."
            />
          </Card>
        )}
      </div>
    </>
  );
}
