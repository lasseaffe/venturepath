// src/components/vault/TicketDetailDrawer.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TicketBarcodeRenderer from './TicketBarcodeRenderer';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { TICKET_SHARED } from '../../utils/sentinelBusEvents';

// Seed squad members — replace with real squad context when squad feature is wired
const MOCK_SQUAD = [
  { id: 'p1', name: 'Alex', avatar: '🧭' },
  { id: 'p2', name: 'Jordan', avatar: '🗺' },
  { id: 'p3', name: 'Morgan', avatar: '⛰' },
];

/**
 * @param {{ ticket: object|null, onClose: () => void }} props
 */
export default function TicketDetailDrawer({ ticket, onClose }) {
  const { dispatch } = useTripStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [manageOpen, setManageOpen] = useState(false);

  function handleShare() {
    if (!ticket) return;
    if (!selected.length) return;
    dispatch({ type: 'SHARE_TICKET', payload: { ticketId: ticket.id, pioneerIds: selected } });
    sentinelBus.emit(TICKET_SHARED, { ticketId: ticket.id, pioneerIds: selected });
    setShareOpen(false);
    setSelected([]);
  }

  function handleRevoke(pioneerId) {
    if (!ticket) return;
    const next = (ticket.sharedWith ?? []).filter(id => id !== pioneerId);
    dispatch({ type: 'UPDATE_TICKET', payload: { id: ticket.id, sharedWith: next, isShared: next.length > 0 } });
  }

  function handleRevokeAll() {
    if (!ticket) return;
    dispatch({ type: 'UPDATE_TICKET', payload: { id: ticket.id, sharedWith: [], isShared: false } });
    setManageOpen(false);
  }

  function handleDelete() {
    if (!ticket) return;
    dispatch({ type: 'DELETE_TICKET', payload: ticket.id });
    onClose();
  }

  return (
    <AnimatePresence>
      {ticket && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl p-6 overflow-y-auto max-h-[90dvh]"
            style={{ background: '#0E1012', color: 'white' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-playfair text-xl">{ticket.title}</p>
                <p className="font-mono text-xs text-[#D9C5B2] mt-0.5">{ticket.provider}</p>
              </div>
              <button onClick={onClose} className="text-[#D9C5B2] hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Barcode */}
            {ticket.barcodeData && (
              <div className="flex justify-center my-4 bg-black/30 rounded-xl p-4">
                <TicketBarcodeRenderer
                  data={ticket.barcodeData}
                  type={ticket.barcodeType ?? 'qr'}
                  className="max-w-xs w-full"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-sm">
              {ticket.referenceCode && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Reference</p>
                  <p className="text-[#E67E22]">{ticket.referenceCode}</p>
                </div>
              )}
              {ticket.validFrom && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Valid from</p>
                  <p>{new Date(ticket.validFrom).toLocaleString()}</p>
                </div>
              )}
              {ticket.validUntil && (
                <div>
                  <p className="text-xs text-[#D9C5B2]">Valid until</p>
                  <p>{new Date(ticket.validUntil).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#D9C5B2]">Source</p>
                <p className="capitalize">{ticket.source}</p>
              </div>
            </div>

            {/* Share with Squad */}
            {!shareOpen && !manageOpen && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex-1 py-2 rounded-lg font-mono text-sm border border-[#E67E22]/50 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors"
                >
                  Share with Squad
                </button>
                {(ticket.sharedWith?.length > 0) && (
                  <button
                    onClick={() => setManageOpen(true)}
                    className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2] hover:bg-white/5"
                  >
                    Manage ({ticket.sharedWith.length})
                  </button>
                )}
              </div>
            )}

            {/* Pioneer selector */}
            {shareOpen && (
              <div className="mt-4">
                <p className="font-mono text-sm text-[#D9C5B2] mb-2">Select Pioneers:</p>
                <div className="flex flex-col gap-2">
                  {MOCK_SQUAD.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(s => s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id])}
                      className={[
                        'flex items-center gap-3 px-3 py-2 rounded-lg border font-mono text-sm transition-colors',
                        selected.includes(p.id)
                          ? 'border-[#E67E22] bg-[#E67E22]/10 text-white'
                          : 'border-white/10 text-[#D9C5B2]',
                      ].join(' ')}
                    >
                      <span>{p.avatar}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleShare}
                    disabled={!selected.length}
                    className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white disabled:opacity-40"
                  >
                    Confirm Share
                  </button>
                  <button
                    onClick={() => { setShareOpen(false); setSelected([]); }}
                    className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Manage sharing */}
            {manageOpen && (
              <div className="mt-4">
                <p className="font-mono text-sm text-[#D9C5B2] mb-2">Shared with:</p>
                {(ticket.sharedWith ?? []).map(id => {
                  const p = MOCK_SQUAD.find(m => m.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between py-1.5">
                      <span className="font-mono text-sm">{p?.avatar} {p?.name ?? id}</span>
                      <button onClick={() => handleRevoke(id)} className="text-xs font-mono text-red-400 hover:text-red-300">
                        Remove
                      </button>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleRevokeAll} className="text-xs font-mono text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10">
                    Revoke All
                  </button>
                  <button onClick={() => setManageOpen(false)} className="text-xs font-mono text-[#D9C5B2] border border-white/10 px-3 py-1.5 rounded-lg">
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Delete */}
            {!shareOpen && !manageOpen && (
              <button
                onClick={handleDelete}
                className="mt-4 w-full py-2 rounded-lg font-mono text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors"
              >
                Delete Ticket
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
