import { useState, useEffect, useRef } from 'react';

const STEPS = [
  {
    id: 'jd-textarea',
    title: 'Step 1 — Paste a Job Description',
    body: 'Copy any job posting and paste it into the large text area on the left.',
    placement: 'right',
  },
  {
    id: 'parse-jd-btn',
    title: 'Step 2 — Parse the JD',
    body: 'Click "Parse JD" to extract skills, behaviors, and duties from the posting.',
    placement: 'top',
  },
  {
    id: 'resume-tab',
    title: 'Step 3 — Switch to Your Resume',
    body: 'Click the Resume tab, then paste your resume text and click "Parse Resume".',
    placement: 'bottom',
  },
  {
    id: 'match-tab',
    title: 'Step 4 — See Your Match',
    body: 'Click the Match tab to see your gap analysis — matched skills, missing skills, and behavioral signals.',
    placement: 'bottom',
  },
];

const STORAGE_KEY = 'nat20-tour-done';

function getTargetRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function TooltipBox({ step, stepIndex, total, onNext, onSkip }) {
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const r = getTargetRect(step.id);
      setRect(r);
      setVisible(!!r);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.id]);

  if (!visible || !rect) return null;

  const GAP = 12;
  const BOX_W = 280;
  const BOX_H = 150;

  let top, left;
  if (step.placement === 'right') {
    top = rect.top + rect.height / 2 - BOX_H / 2;
    left = rect.right + GAP;
  } else if (step.placement === 'top') {
    top = rect.top - BOX_H - GAP;
    left = rect.left + rect.width / 2 - BOX_W / 2;
  } else {
    // bottom (default)
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2 - BOX_W / 2;
  }

  // clamp to viewport
  top = Math.max(8, Math.min(top, window.innerHeight - BOX_H - 8));
  left = Math.max(8, Math.min(left, window.innerWidth - BOX_W - 8));

  const isLast = stepIndex === total - 1;

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        width: BOX_W,
        zIndex: 10000,
        background: '#1e293b',
        color: '#f1f5f9',
        borderRadius: 10,
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
        {stepIndex + 1} / {total}
      </div>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{step.title}</div>
      <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 14, lineHeight: 1.5 }}>
        {step.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
          }}
        >
          Skip
        </button>
        <button
          onClick={onNext}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {isLast ? 'Got it ✓' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

export default function HowToTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // small delay so DOM is ready
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const closeTour = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setActive(false);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      closeTour();
    }
  };

  const startTour = () => {
    setStepIndex(0);
    setActive(true);
  };

  return (
    <>
      {/* Persistent help button */}
      <button
        onClick={startTour}
        title="How to use ResumeMatch"
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 9999,
          background: '#1e293b',
          color: '#94a3b8',
          border: '1px solid #334155',
          borderRadius: 20,
          padding: '6px 14px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          fontFamily: 'sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        ? How-to
      </button>

      {active && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 9998,
            }}
            onClick={closeTour}
          />
          <TooltipBox
            step={STEPS[stepIndex]}
            stepIndex={stepIndex}
            total={STEPS.length}
            onNext={handleNext}
            onSkip={closeTour}
          />
        </>
      )}
    </>
  );
}
