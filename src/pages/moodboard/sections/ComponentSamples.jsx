import { useState } from 'react';
import { SectionShell, CARD } from './SectionShell';

export function ComponentSamples() {
  const [val, setVal] = useState('');
  return (
    <SectionShell id="components" number="05" title="Components" lede="Token-driven primitives — buttons, inputs, status pills, tactical readouts.">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <button style={{ background: 'var(--cta)', color: '#fff', padding: '10px 18px', borderRadius: 'var(--radius-card)', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Architect ▸
            </button>
            <button style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '10px 18px', borderRadius: 'var(--radius-card)', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Vote · Ledger
            </button>
            <button style={{ background: 'transparent', color: '#F2A900', border: '1px solid #F2A900', padding: '10px 18px', borderRadius: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              ⊕ SOS Beacon
            </button>
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Inputs & status</h3>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Search Pro-Paths…"
            className="w-full px-3 py-2 outline-none mb-3"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', fontSize: 13 }}
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] px-2.5 py-1" style={{ background: 'var(--surface)', color: 'var(--status-ok)', border: '1px solid var(--status-ok)', borderRadius: 9999, fontFamily: '"JetBrains Mono", monospace' }}>ON-TRACK</span>
            <span className="text-[10px] px-2.5 py-1" style={{ background: 'var(--surface)', color: 'var(--status-warn)', border: '1px solid var(--status-warn)', borderRadius: 9999, fontFamily: '"JetBrains Mono", monospace' }}>CAUTION</span>
            <span className="text-[10px] px-2.5 py-1" style={{ background: 'var(--surface)', color: 'var(--status-alert)', border: '1px solid var(--status-alert)', borderRadius: 9999, fontFamily: '"JetBrains Mono", monospace' }}>ABORT</span>
          </div>
        </div>

        <div className="p-5 md:col-span-2" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Tactical readout</h3>
          <pre style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
{`LEG 03 · USHUAIA → BEAGLE CHANNEL
LAT -54.8019  LON -68.3030  ALT 56m
ETA 14:32  WIND 18kn SW  TEMP 4°C
NEXT WAYPOINT  47.2 km · 1h 38m`}
          </pre>
        </div>
      </div>
    </SectionShell>
  );
}
