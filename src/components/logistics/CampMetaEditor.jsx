import { useTripStore } from '../../store/useTripStore';

const SPRUCE = '#3A6B5C';
const SITE_TYPES = ['tent', 'rv', 'campervan', 'hammock', 'bivy', 'cabin'];
const SANITATION_OPTS = ['flush', 'pit', 'composting', 'pack-out', 'none'];

export function CampMetaEditor({ stay }) {
  const { updateCampMeta } = useTripStore();
  const meta = stay.campMeta ?? {};

  function update(patch) { updateCampMeta(stay.id, patch); }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      background: 'rgba(58,107,92,0.08)',
      border: `1px solid ${SPRUCE}`,
      borderRadius: 4,
      padding: 12,
      fontSize: '0.78rem',
      color: '#D9C5B2',
      marginTop: 8,
    }}>
      <div style={{ color: SPRUCE, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
        Camp Configuration — {stay.name}
      </div>

      <Field label="Site type">
        <select
          value={meta.siteType ?? 'tent'}
          onChange={e => update({ siteType: e.target.value })}
          style={selectStyle}
        >
          {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      <Field label="Bear country">
        <Toggle
          checked={!!meta.bearCountry}
          onChange={v => update({ bearCountry: v })}
          label="Bear country toggle"
        />
      </Field>

      <Field label="Fire permitted">
        <Toggle
          checked={meta.fireRules?.permitted !== false}
          onChange={v => update({ fireRules: { ...meta.fireRules, permitted: v } })}
          label="Fire permitted toggle"
        />
      </Field>

      <Field label="Water treat">
        <Toggle
          checked={!!meta.waterSource?.treatRequired}
          onChange={v => update({ waterSource: { ...meta.waterSource, treatRequired: v } })}
          label="Water treatment required toggle"
        />
      </Field>

      <Field label="Sanitation">
        <select
          value={meta.sanitation ?? 'none'}
          onChange={e => update({ sanitation: e.target.value })}
          style={selectStyle}
        >
          {SANITATION_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
    </div>
  );
}

const selectStyle = {
  background: '#0E1012',
  color: '#D9C5B2',
  border: '1px solid #333',
  fontFamily: 'inherit',
  padding: '2px 6px',
  borderRadius: 2,
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ minWidth: 90, color: '#666' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
      style={{
        background: checked ? SPRUCE : '#1a1a1a',
        border: `1px solid ${checked ? SPRUCE : '#333'}`,
        borderRadius: 12,
        width: 36,
        height: 20,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked ? 18 : 2,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}
