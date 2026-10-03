import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface GuideStepConfig {
  section: 'overview' | 'customer' | 'transactions' | 'cases';
  target: string;
  tag: string;
  title: string;
  description: string;
  setup?: () => void;
}

export const GUIDE_STEPS: GuideStepConfig[] = [
  {
    section: 'overview',
    target: '[data-guide="portfolio-map"]',
    tag: 'PORTFOLIO INTELLIGENCE',
    title: 'Dual-Risk Portfolio Map',
    description:
      'Traditional banking systems monitor fraud and credit distress in isolated silos. Meridian plots Scam Risk and Repayment Risk together on a single canvas, instantly exposing customers whose sudden scam losses will trigger loan defaults tomorrow.',
  },
  {
    section: 'overview',
    target: '[data-guide="attention-queue"]',
    tag: 'TRIAGE & PRIORITIZATION',
    title: 'Prioritized Attention Queue',
    description:
      'Filter and rank accounts by risk score bands, observed behavioral context (e.g., scam-linked distress, pass-through mule, or organic distress), and payment channels to triage urgent cases first.',
  },
  {
    section: 'customer',
    target: '[data-guide="score-grid"]',
    tag: 'DUAL RISK SCORING',
    title: 'Scam Risk vs. Repayment Risk',
    description:
      'Scam Risk flags suspicious behavioral anomalies and unauthorized transfers. Repayment Risk calculates debt servicing probability. The liquidity balance highlights the exact projected shortfall against the upcoming EMI.',
  },
  {
    section: 'customer',
    target: '[data-guide="timeline-playback"]',
    tag: 'TEMPORAL DYNAMICS',
    title: 'As-Of Story Replay',
    description:
      'Scrub day-by-day across September to watch the risk episode unfold. Notice how a ₹42,000 outgoing transfer on Day 12 causes the scam score to spike, followed immediately by liquidity depletion before the monthly EMI.',
  },
  {
    section: 'customer',
    target: '[data-guide="context-card"]',
    tag: 'AUTOMATED DIAGNOSTICS',
    title: 'Context Assessment Engine',
    description:
      'Rather than treating payment failure as routine delinquency, the rules engine correlates the scam event with the cash shortfall, diagnosing "Possible scam-linked distress" with signal confidence and alternative hypotheses.',
  },
  {
    section: 'customer',
    target: '[data-guide="actions-card"]',
    tag: 'CONNECTED WORKFLOW',
    title: 'Recommended Interventions',
    description:
      'Instead of hostile collection notices, the system recommends a unified, empathetic response—combining proactive scam verification with loan restructuring. Clicking "+" instantly converts any recommendation into an assigned task.',
  },
  {
    section: 'transactions',
    target: '[data-guide="network-panel"]',
    tag: 'EVIDENCE & MONEY FLOW',
    title: 'Money-Flow Network Graph',
    description:
      'Visually trace fund flows between the customer’s focal account and counterparties. The interactive graph distinguishes rapid pass-through mule networks from coercive outward scam transfers.',
  },
  {
    section: 'cases',
    target: '[data-guide="case-workspace"]',
    tag: 'HUMAN-IN-THE-LOOP',
    title: 'Case Review & Accountability',
    description:
      'Interventions become accountable review tasks. Human investigators inspect captured evidence snapshots, log customer contact attempts, complete review checklists, and record official dispositions with an immutable audit trail.',
  },
];

interface PrototypeGuideProps {
  open: boolean;
  onClose: () => void;
  onNavigateSection: (section: 'overview' | 'customer' | 'transactions' | 'cases') => void;
  onPrepareStep?: (stepIndex: number) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function PrototypeGuide({
  open,
  onClose,
  onNavigateSection,
  onPrepareStep,
}: PrototypeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 120, left: 120 });
  const cardRef = useRef<HTMLDivElement>(null);

  const step = GUIDE_STEPS[currentStep];

  // Update target spotlight and card position
  const measureTarget = useCallback(() => {
    if (!open) return;
    const targetSelector = GUIDE_STEPS[currentStep]?.target;
    if (!targetSelector) return;

    const el = document.querySelector(targetSelector);
    if (!el) {
      // Element not in DOM yet, retry with animation frame
      requestAnimationFrame(() => {
        const retryEl = document.querySelector(targetSelector);
        if (retryEl) {
          measureTarget();
        }
      });
      return;
    }

    const r = el.getBoundingClientRect();
    const pad = 8;
    const top = Math.max(0, r.top - pad);
    const left = Math.max(0, r.left - pad);
    const width = Math.min(window.innerWidth - left, r.width + pad * 2);
    const height = Math.min(window.innerHeight - top, r.height + pad * 2);

    const newSpotlight = { top, left, width, height };
    setSpotlightRect(newSpotlight);

    // Calculate smart card position
    const cardEl = cardRef.current;
    const cardWidth = cardEl ? cardEl.offsetWidth : 400;
    const cardHeight = cardEl ? cardEl.offsetHeight : 240;

    let cTop = 0;
    let cLeft = 0;

    const spaceBelow = window.innerHeight - (top + height);
    const spaceAbove = top;
    const spaceRight = window.innerWidth - (left + width);
    const spaceLeft = left;

    // Prefer below if at least 250px space
    if (spaceBelow >= cardHeight + 20) {
      cTop = top + height + 14;
      cLeft = left + (width - cardWidth) / 2;
    } else if (spaceAbove >= cardHeight + 20) {
      cTop = top - cardHeight - 14;
      cLeft = left + (width - cardWidth) / 2;
    } else if (spaceRight >= cardWidth + 20) {
      cTop = top + Math.max(0, (height - cardHeight) / 2);
      cLeft = left + width + 18;
    } else if (spaceLeft >= cardWidth + 20) {
      cTop = top + Math.max(0, (height - cardHeight) / 2);
      cLeft = left - cardWidth - 18;
    } else {
      // Clamped fallback in center-bottom
      cTop = Math.max(20, window.innerHeight - cardHeight - 30);
      cLeft = Math.max(20, (window.innerWidth - cardWidth) / 2);
    }

    // Keep card strictly within viewport
    const clampedMargin = 16;
    cLeft = Math.max(clampedMargin, Math.min(window.innerWidth - cardWidth - clampedMargin, cLeft));
    cTop = Math.max(clampedMargin, Math.min(window.innerHeight - cardHeight - clampedMargin, cTop));

    setCardPos({ top: cTop, left: cLeft });
  }, [open, currentStep]);

  // Navigate section and prepare step when step index changes
  useEffect(() => {
    if (!open) return;
    const targetStep = GUIDE_STEPS[currentStep];
    if (targetStep) {
      onNavigateSection(targetStep.section);
      if (onPrepareStep) {
        onPrepareStep(currentStep);
      }
    }

    // Let React render the new section, scroll element into view, then measure
    const timer = setTimeout(() => {
      const el = document.querySelector(targetStep.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      measureTarget();
    }, 120);

    const timer2 = setTimeout(() => {
      measureTarget();
    }, 380);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentStep]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!open) return;
    const handleRecalc = () => measureTarget();
    window.addEventListener('resize', handleRecalc);
    window.addEventListener('scroll', handleRecalc, true);
    return () => {
      window.removeEventListener('resize', handleRecalc);
      window.removeEventListener('scroll', handleRecalc, true);
    };
  }, [open, measureTarget]);

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < GUIDE_STEPS.length - 1) {
          e.preventDefault();
          setCurrentStep((prev) => prev + 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          e.preventDefault();
          setCurrentStep((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentStep, onClose]);

  // Reset to first step whenever guide is newly opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  if (!open) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  // Build cutout polygon for backdrop blur
  let clipPathStyle: string | undefined = undefined;
  if (spotlightRect) {
    const { top, left, width, height } = spotlightRect;
    const right = left + width;
    const bottom = top + height;
    clipPathStyle = `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
  }

  return (
    <div
      className="guide-root"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Prototype Guide"
    >
      {/* Blurred & dimmed backdrop with cutout hole for target. Backdrop click does not dismiss */}
      <div
        className="guide-backdrop-cutout"
        style={{ clipPath: clipPathStyle }}
      />

      {/* Target element spotlight frame & glow ring */}
      {spotlightRect && (
        <div
          className="guide-spotlight-box"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Guided explanation card */}
      <div
        ref={cardRef}
        className="guide-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: cardPos.top,
          left: cardPos.left,
        }}
      >
        <div className="guide-card-header">
          <div className="guide-meta">
            <span className="guide-step-pill">
              STEP {String(currentStep + 1).padStart(2, '0')} / {String(GUIDE_STEPS.length).padStart(2, '0')}
            </span>
            <span className="guide-tag">
              <span className="guide-tag-dot" />
              {step.tag}
            </span>
          </div>
          <button
            className="guide-close-btn"
            onClick={onClose}
            aria-label="Close guide"
            title="Close guide (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress indicator pills */}
        <div className="guide-progress-bar" aria-hidden="true">
          {GUIDE_STEPS.map((_, i) => (
            <span
              key={i}
              className={`guide-progress-dot ${
                i === currentStep ? 'active' : i < currentStep ? 'completed' : ''
              }`}
              onClick={() => setCurrentStep(i)}
              title={`Jump to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="guide-card-body">
          <h2 className="guide-card-title">{step.title}</h2>
          <p className="guide-card-desc">{step.description}</p>
        </div>

        <div className="guide-card-footer">
          <button
            className="guide-nav-btn secondary"
            disabled={isFirstStep}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            aria-label="Previous step"
          >
            <ChevronLeft size={15} />
            &lt;&lt; Step
          </button>

          <span className="guide-kbd-hint">Esc to exit · ← / → navigate</span>

          {isLastStep ? (
            <button
              className="guide-nav-btn primary finish"
              onClick={onClose}
              aria-label="Complete guide"
            >
              <Check size={15} />
              Complete Guide
            </button>
          ) : (
            <button
              className="guide-nav-btn primary"
              onClick={() => setCurrentStep((prev) => Math.min(GUIDE_STEPS.length - 1, prev + 1))}
              aria-label="Next step"
            >
              Step &gt;&gt;
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
