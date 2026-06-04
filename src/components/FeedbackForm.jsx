import { useState } from 'react';
import { sendFeedback } from '../lib/email.js';

function ssGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}

function formatSessionResults() {
  const jdResults    = ssGet('beta_jd_results');
  const resumeResults = ssGet('beta_resume_results');
  const jdCount      = sessionStorage.getItem('beta_jd_count') ?? '0';
  const resumeCount  = sessionStorage.getItem('beta_resume_count') ?? '0';

  const lines = [];
  lines.push('Session Summary:');
  lines.push(`JDs parsed: ${jdCount}`);
  lines.push(`Resumes parsed: ${resumeCount}`);

  if (jdResults?.technicalSignals?.length > 0) {
    lines.push('');
    lines.push('Last JD Results:');
    jdResults.technicalSignals.forEach(s => {
      lines.push(`  - ${s.name} (${s.category}) — level ${s.level}, importance ${s.importance}`);
    });
  } else {
    lines.push('');
    lines.push('Last JD Results: none');
  }

  if (resumeResults?.technicalSignals?.length > 0) {
    lines.push('');
    lines.push('Last Resume Results:');
    resumeResults.technicalSignals.forEach(s => {
      lines.push(`  - ${s.name} (${s.category}) — level ${s.level}`);
    });
  } else {
    lines.push('');
    lines.push('Last Resume Results: none');
  }

  return lines.join('\n');
}

export default function FeedbackForm() {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const results = formatSessionResults();
      await sendFeedback({ title: title.trim(), body: body.trim(), results });
      setStatus('success');
    } catch (err) {
      console.error('EmailJS error:', err);
      setErrorMsg(err?.text ?? err?.message ?? 'Unknown error');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMsg('');
  };

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '20px', color: '#059669', fontWeight: '700', marginBottom: '8px' }}>
            Thanks! Feedback sent.
          </div>
          <div style={{ fontSize: '13px', color: '#065f46' }}>
            Your message was delivered to the Nat20 team.
          </div>
          <button
            onClick={() => { setTitle(''); setBody(''); setStatus('idle'); }}
            className="mt-4 text-xs px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-100 transition"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Feedback
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Found a bug or have a suggestion? Your current session parse results will be included
          automatically to help us debug.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What issue did you notice?"
            disabled={status === 'sending'}
            className="w-full p-3 border border-slate-200 rounded-lg text-[13px] bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none focus:border-indigo-400"
            style={{ opacity: status === 'sending' ? 0.6 : 1 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
            Description
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Describe what went wrong or what you'd like to see improved..."
            rows={5}
            disabled={status === 'sending'}
            className="w-full p-3 border border-slate-200 rounded-lg font-mono text-[13px] leading-relaxed bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none focus:border-indigo-400 resize-none"
            style={{ opacity: status === 'sending' ? 0.6 : 1 }}
          />
        </div>

        {status === 'error' && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#dc2626',
            }}
          >
            <strong>Failed to send.</strong>
            {errorMsg && <span> {errorMsg}</span>}
            <button
              type="button"
              onClick={handleReset}
              className="ml-3 text-xs px-2.5 py-1 border border-red-300 rounded hover:bg-red-50 transition"
            >
              Try again
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'sending' || !title.trim() || !body.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition shadow-sm"
          style={{
            opacity: (status === 'sending' || !title.trim() || !body.trim()) ? 0.6 : 1,
            cursor: (status === 'sending' || !title.trim() || !body.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'sending' ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>

      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Session data included with your feedback
        </div>
        <pre style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
          {formatSessionResults()}
        </pre>
      </div>
    </div>
  );
}
