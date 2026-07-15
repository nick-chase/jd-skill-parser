/**
 * ConfidenceDot — small colored dot indicating confidence level.
 * Shared by GapAnalysisView (jd-skill-parser.jsx) and LiteResultsView.
 */
export default function ConfidenceDot({ confidence }) {
  const color = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#94a3b8'
  return <span style={{ color, fontSize: '10px', marginLeft: '2px', lineHeight: 1 }}>●</span>
}
