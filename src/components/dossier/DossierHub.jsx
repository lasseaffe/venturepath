// src/components/dossier/DossierHub.jsx
import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import DossierIngest from './DossierIngest';
import MedicAccessBadge from './MedicAccessBadge';

const TYPE_ICONS = { flight: '✈', hotel: '🏨', permit: '📋', insurance: '🛡', medical: '🩺' };

function DocCard({ doc, userRole, legs }) {
  const [showRaw, setShowRaw] = useState(false);
  const leg = legs?.find(l => l.id === doc.leg_id);

  return (
    <div className="bg-black/30 border border-white/10 rounded p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-white">
            {doc.extracted?.carrier ?? doc.extracted?.confirmation ?? doc.type}
          </p>
          <p className="text-xs text-[#D9C5B2] font-mono mt-1">
            {doc.extracted?.dates?.start ?? '—'} → {doc.extracted?.dates?.end ?? '—'}
            {doc.extracted?.price ? ` · €${doc.extracted.price}` : ''}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 text-[#D9C5B2]">
              {leg ? `Leg: ${leg.from ?? leg.id}` : 'Unlinked'}
            </span>
            <button
              onClick={() => setShowRaw(r => !r)}
              className="text-xs font-mono px-2 py-0.5 rounded border border-[#E67E22]/30 text-[#E67E22] hover:bg-[#E67E22]/10"
            >
              {showRaw ? 'Hide Raw' : 'View Raw'}
            </button>
          </div>
          {showRaw && (
            <pre className="mt-2 text-xs text-[#D9C5B2] font-mono bg-black/50 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
              {doc.raw}
            </pre>
          )}
        </div>
        <MedicAccessBadge doc={doc} userRole={userRole} />
      </div>
    </div>
  );
}

export default function DossierHub() {
  const { vault, userRole, legs } = useTripStore();
  const [showIngest, setShowIngest] = useState(false);

  const grouped = (vault?.documents ?? []).reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-playfair text-2xl">Dossier</h2>
        <button
          onClick={() => setShowIngest(true)}
          className="px-4 py-2 bg-[#E67E22] text-black font-mono text-sm rounded"
        >
          + Add Document
        </button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-[#D9C5B2]">
          <p className="text-4xl mb-3">🗄</p>
          <p className="font-playfair text-lg mb-1">Your Dossier is empty</p>
          <p className="text-sm font-mono">Paste booking confirmations or upload PDFs to auto-create Legs.</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, docs]) => (
        <div key={type} className="mb-6">
          <h3 className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-2">
            {TYPE_ICONS[type]} {type}
          </h3>
          <div className="space-y-2">
            {docs.map(doc => (
              <DocCard key={doc.id} doc={doc} userRole={userRole} legs={legs} />
            ))}
          </div>
        </div>
      ))}

      {showIngest && <DossierIngest onClose={() => setShowIngest(false)} />}
    </div>
  );
}
