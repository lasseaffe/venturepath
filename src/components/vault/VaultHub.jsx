// src/components/vault/VaultHub.jsx
import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import VaultIngest from './VaultIngest';
import MedicAccessBadge from './MedicAccessBadge';

const TYPE_ICONS = { flight: '✈', hotel: '🏨', permit: '📋', insurance: '🛡', medical: '🩺' };

export default function VaultHub() {
  const { vault, userRole } = useTripStore();
  const [showIngest, setShowIngest] = useState(false);

  const grouped = (vault?.documents ?? []).reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-playfair text-2xl">Vault</h2>
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
          <p className="font-playfair text-lg mb-1">Your Vault is empty</p>
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
              <div key={doc.id} className="bg-black/30 border border-white/10 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-white">
                      {doc.extracted?.carrier ?? doc.extracted?.confirmation ?? doc.type}
                    </p>
                    <p className="text-xs text-[#D9C5B2] font-mono mt-1">
                      {doc.extracted?.dates?.start ?? '—'} → {doc.extracted?.dates?.end ?? '—'}
                      {doc.extracted?.price ? ` · €${doc.extracted.price}` : ''}
                    </p>
                  </div>
                  <MedicAccessBadge doc={doc} userRole={userRole} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showIngest && <VaultIngest onClose={() => setShowIngest(false)} />}
    </div>
  );
}
