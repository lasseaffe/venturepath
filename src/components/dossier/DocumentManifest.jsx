// src/components/dossier/DocumentManifest.jsx
import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import TicketDetailDrawer from './TicketDetailDrawer';
import TicketImportModal from './TicketImportModal';

/**
 * Compact ticket list for the Logistics panel.
 * @param {{ expeditionId?: string }} props
 */
export default function DocumentManifest({ expeditionId }) {
  const { tickets } = useTripStore();
  const [open, setOpen]           = useState(true);
  const [selected, setSelected]   = useState(null);
  const [importing, setImporting] = useState(false);

  const scoped = expeditionId
    ? tickets.filter(t => t.expeditionId === expeditionId)
    : tickets;

  return (
    <div className="border-t border-white/10 mt-6 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="font-mono text-sm text-[#D9C5B2] uppercase tracking-wider">
          Documents ({scoped.length})
        </span>
        <span className="text-[#D9C5B2] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {scoped.length === 0 ? (
            <p className="font-mono text-xs text-[#D9C5B2]/60">
              No documents. Add tickets to your Passport Dossier.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {scoped.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="flex items-center justify-between text-left px-3 py-2 rounded-lg border border-white/10 hover:border-[#E67E22]/30 transition-colors"
                  style={{ background: '#0E1012' }}
                >
                  <div>
                    <p className="font-mono text-sm text-white">{t.title}</p>
                    {t.referenceCode && (
                      <p className="font-mono text-xs text-[#E67E22]">{t.referenceCode}</p>
                    )}
                  </div>
                  <p className="font-mono text-xs text-[#D9C5B2]">
                    {t.validFrom ? new Date(t.validFrom).toLocaleDateString() : '—'}
                  </p>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setImporting(true)}
            className="mt-3 w-full py-2 rounded-lg font-mono text-xs border border-[#E67E22]/30 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors"
          >
            + Add Document
          </button>
        </>
      )}

      <TicketDetailDrawer ticket={selected} onClose={() => setSelected(null)} />
      <TicketImportModal open={importing} onClose={() => setImporting(false)} expeditionId={expeditionId} />
    </div>
  );
}
