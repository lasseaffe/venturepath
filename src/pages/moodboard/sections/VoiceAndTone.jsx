import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function VoiceAndTone() {
  const { voice, vocabulary } = moodboard;
  return (
    <SectionShell id="voice" number="07" title="Voice & Tone" lede="Expedition vocabulary is the brand. Generic synonyms are a compliance failure (Apple 4.3).">
      <div className="p-5 mb-5" style={CARD}>
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Pillars</h3>
        <ul className="space-y-2 list-none">
          {voice.pillars.map((p) => (
            <li key={p} className="flex items-baseline gap-3 text-[14px]" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace' }}>⊕</span>{p}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5 mb-5" style={CARD}>
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>
          VP-1 Vocabulary contract (Apple compliance — VP-1 in APPLE_COMPLIANCE.md)
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {vocabulary.map((v) => (
            <div key={v.use} className="flex items-baseline gap-3 text-[13px]">
              <span style={{ color: 'var(--status-ok)', fontFamily: '"JetBrains Mono", monospace', minWidth: 18 }}>✓</span>
              <div className="flex-1">
                <span style={{ color: 'var(--text-primary)', fontFamily: '"Playfair Display", serif', fontSize: 16 }}>{v.use}</span>
                <span style={{ color: 'var(--text-muted)' }}> · not </span>
                <span className="line-through" style={{ color: 'var(--status-alert)' }}>{v.avoid}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--status-ok)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Do</h3>
          <ul className="space-y-2">{voice.do.map((d) => <li key={d} style={{ color: 'var(--text-primary)' }}>{d}</li>)}</ul>
        </div>
        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--status-alert)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Don't</h3>
          <ul className="space-y-2">{voice.dont.map((d) => <li key={d} className="line-through" style={{ color: 'var(--text-muted)' }}>{d}</li>)}</ul>
        </div>
      </div>
    </SectionShell>
  );
}
