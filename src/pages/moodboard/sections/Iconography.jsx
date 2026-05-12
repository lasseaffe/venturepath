import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function Iconography() {
  return (
    <SectionShell id="icons" number="09" title="Iconography" lede={`${moodboard.iconLibrary} — ${moodboard.iconNote}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {moodboard.icons.map((i) => (
          <div key={i.name} className="p-4 flex items-center gap-3" style={CARD}>
            <span style={{ fontSize: 22, color: 'var(--accent)', width: 28, textAlign: 'center' }}>{i.name}</span>
            <p className="text-[11px] italic truncate" style={{ color: 'var(--text-secondary)' }}>{i.usage}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
