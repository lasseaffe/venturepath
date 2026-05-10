import { useState } from 'react';
import TicketBarcodeRenderer from './TicketBarcodeRenderer';

function CountdownBadge({ validFrom }) {
  if (!validFrom) return null;
  const ms = new Date(validFrom).getTime() - Date.now();
  if (ms < 0) return <span className="text-xs font-mono text-[#D9C5B2]">Departed</span>;
  const hours = Math.floor(ms / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 72) return null;
  return (
    <span className="text-xs font-mono text-[#E67E22]">
      {hours > 0 ? `Departs in ${hours}h` : `Departs in ${mins}m`}
    </span>
  );
}

function FlightCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="relative flex rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012', minHeight: 120 }}>
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <span className="font-playfair text-2xl text-white">{rawData.origin ?? '???'}</span>
          <span className="text-[#D9C5B2] text-lg">→</span>
          <span className="font-playfair text-2xl text-white">{rawData.destination ?? '???'}</span>
        </div>
        <div>
          <p className="font-mono text-xs text-[#D9C5B2]">{ticket.provider}</p>
          <CountdownBadge validFrom={ticket.validFrom} />
        </div>
      </div>
      <div className="w-px border-l border-dashed border-white/20 self-stretch mx-1" />
      <div className="w-28 p-3 flex flex-col gap-1">
        {rawData.flightNumber && (
          <p className="font-mono text-xs text-white">{rawData.flightNumber}</p>
        )}
        {rawData.seat && (
          <p className="font-mono text-xs text-[#D9C5B2]">Seat {rawData.seat}</p>
        )}
        {rawData.gate && (
          <p className="font-mono text-xs text-[#D9C5B2]">Gate {rawData.gate}</p>
        )}
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="mt-auto w-full"
          />
        )}
      </div>
      {ticket.isShared && (
        <span className="absolute top-2 right-2 text-xs font-mono bg-[#E67E22]/20 text-[#E67E22] px-2 py-0.5 rounded">
          👥 {ticket.sharedWith?.length ?? 0}
        </span>
      )}
    </div>
  );
}

function TransitCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012' }}>
      <div className="h-1.5" style={{ background: rawData.accentColor ?? '#E67E22' }} />
      <div className="p-4">
        <p className="font-playfair text-lg text-white">{ticket.provider}</p>
        <p className="font-mono text-sm text-[#D9C5B2] mt-1">{rawData.route ?? rawData.zone ?? '—'}</p>
        <p className="font-mono text-xs text-[#D9C5B2] mt-2">
          {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
          {ticket.validUntil ? ` → ${new Date(ticket.validUntil).toLocaleDateString()}` : ''}
        </p>
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="mt-3 w-full"
          />
        )}
      </div>
    </div>
  );
}

function AccommodationCard({ ticket }) {
  const { rawData = {} } = ticket;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(ticket.referenceCode ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0E1012' }}>
      <p className="font-playfair text-xl text-white">{ticket.title}</p>
      <div className="flex gap-4 mt-2">
        <div>
          <p className="text-xs text-[#D9C5B2] font-mono">Check-in</p>
          <p className="text-sm text-white font-mono">
            {rawData.checkIn ? new Date(rawData.checkIn).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#D9C5B2] font-mono">Check-out</p>
          <p className="text-sm text-white font-mono">
            {rawData.checkOut ? new Date(rawData.checkOut).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
      {ticket.referenceCode && (
        <button
          onClick={copy}
          className="mt-3 font-mono text-xs text-[#E67E22] border border-[#E67E22]/30 rounded px-2 py-1 hover:bg-[#E67E22]/10 transition-colors"
        >
          {copied ? 'Copied!' : ticket.referenceCode}
        </button>
      )}
    </div>
  );
}

function AccessPassCard({ ticket }) {
  const { rawData = {} } = ticket;
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/10"
         style={{ background: '#0E1012' }}>
      <div className="w-16 flex flex-col items-center justify-center bg-[#E67E22]/10 border-r border-dashed border-white/20 p-2">
        {ticket.barcodeData && (
          <TicketBarcodeRenderer
            data={ticket.barcodeData}
            type={ticket.barcodeType ?? 'qr'}
            className="w-full"
          />
        )}
      </div>
      <div className="flex-1 p-4">
        <p className="font-playfair text-lg text-white">{ticket.title}</p>
        {rawData.venue && <p className="font-mono text-xs text-[#D9C5B2]">{rawData.venue}</p>}
        {rawData.tier  && <p className="font-mono text-xs text-[#E67E22] mt-1">{rawData.tier}</p>}
        <p className="font-mono text-xs text-[#D9C5B2] mt-2">
          {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
        </p>
      </div>
    </div>
  );
}

function MinimalCard({ ticket }) {
  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0E1012' }}>
      <p className="font-playfair text-lg text-white">{ticket.title}</p>
      <p className="font-mono text-xs text-[#D9C5B2] mt-1">{ticket.provider}</p>
      {ticket.referenceCode && (
        <p className="font-mono text-xs text-[#E67E22] mt-2">{ticket.referenceCode}</p>
      )}
      <p className="font-mono text-xs text-[#D9C5B2] mt-1">
        {ticket.validFrom ? new Date(ticket.validFrom).toLocaleDateString() : '—'}
        {ticket.validUntil ? ` → ${new Date(ticket.validUntil).toLocaleDateString()}` : ''}
      </p>
    </div>
  );
}

const CARD_MAP = {
  flight:        FlightCard,
  transit:       TransitCard,
  accommodation: AccommodationCard,
  access_pass:   AccessPassCard,
  visa:          MinimalCard,
  document:      MinimalCard,
};

/**
 * @param {{ ticket: import('../../store/useTripStore').Ticket, onClick?: () => void, tactical?: boolean }} props
 */
export default function TicketCard({ ticket, onClick, tactical = false }) {
  const Card = CARD_MAP[ticket.type] ?? MinimalCard;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-transform hover:scale-[1.01]"
      style={tactical ? { filter: 'sepia(1) hue-rotate(10deg) saturate(3)' } : {}}
    >
      <Card ticket={ticket} />
    </div>
  );
}
