export default function PackingNormalizationPanel() {
  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8, marginTop: 0 }}>Packing Normalization</h2>
      <p style={{ color: '#D9C5B2', fontSize: 13, marginBottom: 24 }}>
        Packing data in VenturePath is managed entirely client-side via Zustand (
        <code>useTripStore</code>) and is not persisted to Supabase.
        Batch normalization via this pipeline is not applicable.
      </p>
      <div style={{
        border: '1px dashed #2A3035', borderRadius: 8,
        padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎒</div>
        <p style={{ color: '#4A5568', fontSize: 13, margin: 0 }}>
          To update packing defaults or category weight mappings, edit{' '}
          <code style={{ color: '#D9C5B2' }}>src/utils/packingLogic.js</code> directly.
        </p>
      </div>
    </div>
  );
}
