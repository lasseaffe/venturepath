// src/components/vault/TicketImportModal.jsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { TICKET_ADDED } from '../../utils/sentinelBusEvents';
import { cacheSoonTickets } from '../../utils/ticketStore';

const TABS = ['Manual', 'Scan', 'Email'];

const TYPE_OPTIONS = [
  { value: 'flight',        label: '✈ Flight' },
  { value: 'transit',       label: '🚆 Transit' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'access_pass',   label: '🎟 Access Pass' },
  { value: 'visa',          label: '📄 Visa' },
  { value: 'document',      label: '📋 Document' },
];

function ManualForm({ onSave }) {
  const [step, setStep]     = useState(1);
  const [type, setType]     = useState('flight');
  const [fields, setFields] = useState({});
  const [file, setFile]     = useState(null);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  function buildTicket() {
    const rawData = { ...fields };
    return {
      id: crypto.randomUUID(),
      type,
      title: fields.title ?? fields.flightNumber ?? fields.provider ?? 'Untitled',
      provider: fields.provider ?? '',
      referenceCode: fields.referenceCode ?? '',
      validFrom: fields.validFrom ?? null,
      validUntil: fields.validUntil ?? null,
      barcodeData: fields.barcodeData ?? null,
      barcodeType: fields.barcodeType ?? null,
      rawData,
      source: 'manual',
      isShared: false,
      sharedWith: [],
      expeditionId: fields.expeditionId ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  const fieldsByType = {
    flight: [
      { key: 'provider',      label: 'Airline',       placeholder: 'United Airlines' },
      { key: 'flightNumber',  label: 'Flight Number', placeholder: 'UA857' },
      { key: 'origin',        label: 'From (IATA)',    placeholder: 'SFO' },
      { key: 'destination',   label: 'To (IATA)',      placeholder: 'LHR' },
      { key: 'validFrom',     label: 'Departure',      placeholder: '', type: 'datetime-local' },
      { key: 'seat',          label: 'Seat',           placeholder: '14A' },
      { key: 'gate',          label: 'Gate',           placeholder: 'B22' },
      { key: 'referenceCode', label: 'Booking Ref',    placeholder: 'ABCD12' },
    ],
    transit: [
      { key: 'provider',      label: 'Provider',    placeholder: 'Transport for London' },
      { key: 'route',         label: 'Route/Zone',  placeholder: 'Zone 1–3' },
      { key: 'validFrom',     label: 'Valid From',  placeholder: '', type: 'date' },
      { key: 'validUntil',    label: 'Valid Until', placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Reference',   placeholder: '' },
    ],
    accommodation: [
      { key: 'title',         label: 'Hotel Name',   placeholder: 'Hotel Marqués de Riscal' },
      { key: 'provider',      label: 'Booking via',  placeholder: 'Booking.com' },
      { key: 'checkIn',       label: 'Check-in',     placeholder: '', type: 'date' },
      { key: 'checkOut',      label: 'Check-out',    placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Conf. Number', placeholder: 'BDC-12345' },
    ],
    access_pass: [
      { key: 'title',         label: 'Event/Place',  placeholder: 'Torres del Paine Permit' },
      { key: 'venue',         label: 'Venue',        placeholder: 'CONAF' },
      { key: 'tier',          label: 'Tier/Section', placeholder: 'Trek W' },
      { key: 'validFrom',     label: 'Entry Date',   placeholder: '', type: 'date' },
      { key: 'referenceCode', label: 'Reference',    placeholder: '' },
    ],
    visa: [
      { key: 'title',         label: 'Visa Type',       placeholder: 'Tourist Visa' },
      { key: 'provider',      label: 'Issuing Country', placeholder: 'Chile' },
      { key: 'referenceCode', label: 'Reference',       placeholder: '' },
      { key: 'validFrom',     label: 'Valid From',      placeholder: '', type: 'date' },
      { key: 'validUntil',    label: 'Valid Until',     placeholder: '', type: 'date' },
    ],
    document: [
      { key: 'title',         label: 'Document Name', placeholder: '' },
      { key: 'provider',      label: 'Issuer',        placeholder: '' },
      { key: 'referenceCode', label: 'Reference',     placeholder: '' },
      { key: 'validFrom',     label: 'Date',          placeholder: '', type: 'date' },
    ],
  };

  const currentFields = fieldsByType[type] ?? [];

  const inputCls = 'w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E67E22]/50';

  return (
    <div>
      {step === 1 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Select ticket type:</p>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setType(opt.value); setStep(2); }}
                className="py-2 px-3 rounded-lg border font-mono text-sm text-left transition-colors border-white/10 text-[#D9C5B2] hover:border-[#E67E22]/50 hover:text-white"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="font-mono text-xs text-[#D9C5B2] mb-3 uppercase tracking-wider">{type.replace('_', ' ')}</p>
          <div className="flex flex-col gap-3">
            {currentFields.map(f => (
              <div key={f.key}>
                <label className="block font-mono text-xs text-[#D9C5B2] mb-1">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={fields[f.key] ?? ''}
                  onChange={e => setField(f.key, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className="block font-mono text-xs text-[#D9C5B2] mb-1">Barcode Data (optional)</label>
              <input
                type="text"
                placeholder="Raw barcode string"
                value={fields.barcodeData ?? ''}
                onChange={e => setField('barcodeData', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(1)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Attach file (optional):</p>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="font-mono text-sm text-[#D9C5B2] w-full"
          />
          {file && <p className="font-mono text-xs text-[#E67E22] mt-2">{file.name}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(2)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button onClick={() => setStep(4)} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="font-mono text-sm text-[#D9C5B2] mb-3">Expedition (optional):</p>
          <input
            type="text"
            placeholder="Expedition ID or leave blank"
            value={fields.expeditionId ?? ''}
            onChange={e => setField('expeditionId', e.target.value)}
            className={inputCls}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => setStep(3)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Back</button>
            <button
              onClick={() => onSave(buildTicket())}
              className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
            >
              Save Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanTab({ onSave }) {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed]     = useState(null);
  const [error, setError]       = useState(null);

  async function startScan() {
    setScanning(true);
    setError(null);
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    readerRef.current = new BrowserMultiFormatReader();
    try {
      await readerRef.current.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
        if (!result) return;
        readerRef.current.reset();
        setScanning(false);
        const raw          = result.getText();
        const barcodeType  = result.getBarcodeFormat().toString().toLowerCase();
        const res = await fetch('/api/tickets/parse-barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcodeData: raw, barcodeType }),
        });
        const data = await res.json();
        setParsed({ ...data.parsed, barcodeData: raw, barcodeType, source: 'scan' });
      });
    } catch {
      setError('Camera access denied or unavailable.');
      setScanning(false);
    }
  }

  function stopScan() {
    readerRef.current?.reset();
    setScanning(false);
  }

  if (parsed) {
    return (
      <div>
        <p className="font-mono text-sm text-[#D9C5B2] mb-3">Detected — confirm fields:</p>
        <pre className="font-mono text-xs text-[#E67E22] bg-black/40 rounded p-3 overflow-auto max-h-48">
          {JSON.stringify(parsed, null, 2)}
        </pre>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setParsed(null)} className="px-3 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Re-scan</button>
          <button
            onClick={() => onSave({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), isShared: false, sharedWith: [], ...parsed })}
            className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
          >
            Save Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="font-mono text-xs text-red-400 mb-2">{error}</p>}
      <video ref={videoRef} className="w-full rounded-xl bg-black/40" style={{ minHeight: 200 }} />
      <div className="flex gap-2 mt-3">
        {scanning
          ? <button onClick={stopScan} className="flex-1 py-2 rounded-lg font-mono text-sm border border-white/10 text-[#D9C5B2]">Stop</button>
          : <button onClick={startScan} className="flex-1 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white">Start Scan</button>
        }
      </div>
    </div>
  );
}

function EmailTab({ onSave }) {
  const [status, setStatus]       = useState('idle');
  const [detected, setDetected]   = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  async function handleConnect() {
    setStatus('scanning');
    try {
      const res  = await fetch('/api/tickets/email-import', { method: 'POST' });
      const data = await res.json();
      setDetected(data.tickets ?? []);
      setStatus('review');
    } catch {
      setStatus('idle');
    }
  }

  const visible = detected.filter(t => !dismissed.has(t._key));

  if (status === 'idle') {
    return (
      <div className="text-center py-6">
        <p className="font-mono text-sm text-[#D9C5B2] mb-4">Connect Gmail to auto-import booking confirmations.</p>
        <button onClick={handleConnect} className="px-6 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white">
          Connect Gmail
        </button>
      </div>
    );
  }

  if (status === 'scanning') {
    return <p className="font-mono text-sm text-[#D9C5B2] text-center py-6">Scanning inbox…</p>;
  }

  if (visible.length === 0) {
    return <p className="font-mono text-sm text-[#D9C5B2] text-center py-6">No booking confirmations found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs text-[#D9C5B2] mb-1">{visible.length} ticket(s) detected:</p>
      {visible.map(t => (
        <div key={t._key} className="bg-black/30 border border-white/10 rounded-lg p-3">
          <p className="font-mono text-sm text-white">{t.title}</p>
          <p className="font-mono text-xs text-[#D9C5B2]">{t.provider} · {t.referenceCode}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onSave({ ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isShared: false, sharedWith: [] });
                setDismissed(s => new Set([...s, t._key]));
              }}
              className="flex-1 py-1 rounded font-mono text-xs bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30"
            >
              Add
            </button>
            <button
              onClick={() => setDismissed(s => new Set([...s, t._key]))}
              className="px-2 py-1 rounded font-mono text-xs border border-white/10 text-[#D9C5B2]"
            >
              Skip
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ open: boolean, onClose: () => void, expeditionId?: string }} props
 */
export default function TicketImportModal({ open, onClose, expeditionId }) {
  const [activeTab, setActiveTab] = useState(0);
  const { dispatch } = useTripStore();

  function handleSave(ticket) {
    const enriched = { ...ticket, expeditionId: ticket.expeditionId ?? expeditionId ?? null };
    dispatch({ type: 'ADD_TICKET', payload: enriched });
    cacheSoonTickets([enriched]);
    sentinelBus.emit(TICKET_ADDED, { ticket: enriched });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl p-6 max-h-[92dvh] overflow-y-auto"
            style={{ background: '#0E1012' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-playfair text-xl text-white">Add Ticket</p>
              <button onClick={onClose} className="text-[#D9C5B2] hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="flex gap-1 mb-5 bg-black/30 rounded-lg p-1">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={[
                    'flex-1 py-1.5 rounded font-mono text-sm transition-colors',
                    activeTab === i ? 'bg-[#E67E22] text-white' : 'text-[#D9C5B2] hover:text-white',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 0 && <ManualForm onSave={handleSave} />}
            {activeTab === 1 && <ScanTab onSave={handleSave} />}
            {activeTab === 2 && <EmailTab onSave={handleSave} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
