// src/components/vault/VaultIngest.jsx
import { useState } from 'react';
import { extractVaultDocument } from '../../utils/vaultExtractor';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { VAULT_DOCUMENT_ADDED } from '../../utils/sentinelBusEvents';

const TABS = ['Paste Text', 'Upload File'];
const DOC_TYPES = ['flight', 'hotel', 'permit', 'insurance', 'medical'];

export default function VaultIngest({ onClose }) {
  const { dispatch, legs } = useTripStore();
  const [tab, setTab] = useState(0);
  const [raw, setRaw] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [docType, setDocType] = useState('flight');
  const [loading, setLoading] = useState(false);

  const handleExtract = () => {
    const result = extractVaultDocument(raw);
    setExtracted(result);
  };

  const handleConfirm = () => {
    const doc = {
      type: docType,
      raw,
      extracted,
      leg_id: null,
      medic_emergency_access: false,
    };
    dispatch({ type: 'ADD_VAULT_DOCUMENT', payload: doc });
    const startStr = extracted?.dates?.start;
    const suggestedLegIndex = startStr
      ? legs.findIndex(l => l.startISO && l.startISO.slice(0, 10) === startStr.slice(0, 10))
      : legs.length > 0 ? 0 : null;
    sentinelBus.emit(VAULT_DOCUMENT_ADDED, { doc, suggestedLegIndex: suggestedLegIndex === -1 ? null : suggestedLegIndex });
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    if (file.type === 'application/pdf') {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      setRaw(text);
      setExtracted(extractVaultDocument(text));
    } else {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setRaw(text);
      setExtracted(extractVaultDocument(text));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0E1012] border border-[#E67E22]/30 rounded-lg p-6 w-full max-w-lg">
        <h2 className="font-playfair text-white text-xl mb-4">Add Document to Vault</h2>

        <div className="flex gap-2 mb-4 flex-wrap">
          {DOC_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setDocType(t)}
              className={`text-xs px-3 py-1 rounded font-mono capitalize ${
                docType === t ? 'bg-[#E67E22] text-black' : 'border border-[#E67E22]/30 text-[#D9C5B2]'
              }`}
            >{t}</button>
          ))}
        </div>

        <div className="flex gap-4 border-b border-white/10 mb-4">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`pb-2 text-sm font-mono ${tab === i ? 'border-b-2 border-[#E67E22] text-[#E67E22]' : 'text-[#D9C5B2]'}`}
            >{t}</button>
          ))}
        </div>

        {tab === 0 && (
          <textarea
            className="w-full h-32 bg-black/40 border border-white/10 rounded p-3 text-sm text-white font-mono resize-none mb-3"
            placeholder="Paste your booking confirmation text here..."
            value={raw}
            onChange={e => setRaw(e.target.value)}
          />
        )}

        {tab === 1 && (
          <div className="mb-3">
            <input type="file" accept=".pdf,image/*" onChange={handleFile} className="text-[#D9C5B2] text-sm" />
            {loading && <p className="text-[#E67E22] text-xs mt-2 font-mono">Extracting...</p>}
          </div>
        )}

        {tab === 0 && !extracted && (
          <button onClick={handleExtract} className="w-full py-2 bg-[#E67E22] text-black font-mono text-sm rounded mb-3">
            Extract Fields
          </button>
        )}

        {extracted && (
          <div className="border border-[#E67E22]/30 rounded p-3 mb-3 text-sm font-mono text-[#D9C5B2] space-y-1">
            {extracted.confidence === 'low' && (
              <p className="text-amber-400 text-xs mb-2">We couldn't read all the details — please review the fields below.</p>
            )}
            {Object.entries(extracted).filter(([k]) => k !== 'confidence').map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-[#E67E22] w-28">{k}:</span>
                <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded">Cancel</button>
          {extracted && (
            <button onClick={handleConfirm} className="px-4 py-2 text-sm font-mono bg-[#E67E22] text-black rounded">
              Save to Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
