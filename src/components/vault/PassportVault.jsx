import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTheme } from '../../context/ThemeContext';
import TicketCard from './TicketCard';
import TicketDetailDrawer from './TicketDetailDrawer';
import TicketImportModal from './TicketImportModal';
import { cacheSoonTickets } from '../../utils/ticketStore';

const CATEGORIES = ['All', 'flight', 'transit', 'accommodation', 'access_pass', 'visa', 'document'];
const CAT_LABELS = {
  All: 'All',
  flight: 'Flights',
  transit: 'Transit',
  accommodation: 'Stays',
  access_pass: 'Access',
  visa: 'Visa',
  document: 'Docs',
};

export default function PassportVault({ expeditionFilter }) {
  const { tickets } = useTripStore();
  const { theme } = useTheme();
  const isTactical = theme === 'tactical';

  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tacticalTickets, setTacticalTickets] = useState([]);

  // Cache soon-departing tickets for offline access in Tactical Mode
  useEffect(() => {
    cacheSoonTickets(tickets).catch(err =>
      console.warn('[PassportVault] IndexedDB cache failed:', err)
    );
  }, [tickets]);

  // Restore cached tickets in Tactical Mode if offline
  useEffect(() => {
    if (isTactical && tickets.length === 0) {
      import('../../utils/ticketStore').then(({ getCachedTickets }) => {
        getCachedTickets().then(setTacticalTickets);
      });
    }
  }, [isTactical, tickets.length]);

  // Use cached tickets in Tactical Mode when online store is empty
  const source = isTactical && tickets.length === 0 ? tacticalTickets : tickets;
  const now = Date.now();

  // Build upcoming strip: next 3 tickets by validFrom
  const upcoming = source
    .filter(t => t.validFrom && new Date(t.validFrom).getTime() > now)
    .sort((a, b) => new Date(a.validFrom) - new Date(b.validFrom))
    .slice(0, 3);

  // Count urgent tickets: within next 48 hours
  const cutoff = now + 48 * 60 * 60 * 1000;
  const urgentCount = source.filter(t => {
    const ts = t.validFrom ? new Date(t.validFrom).getTime() : null;
    return ts && ts >= now && ts <= cutoff;
  }).length;

  // Apply filter and expedition filter
  const filtered = source.filter(t => {
    if (expeditionFilter && t.expeditionId !== expeditionFilter) return false;
    if (filter !== 'All' && t.type !== filter) return false;
    return true;
  });

  return (
    <div
      className="flex flex-col h-full overflow-y-auto p-4 gap-6"
      style={{ color: 'white' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-2xl">PassportVault</h2>
          {urgentCount > 0 && (
            <p className="font-mono text-xs text-[#E67E22] mt-0.5">
              {urgentCount} ticket{urgentCount > 1 ? 's' : ''} active soon
            </p>
          )}
        </div>
      </div>

      {/* Upcoming strip — only show when not filtering by expedition */}
      {upcoming.length > 0 && !expeditionFilter && (
        <div>
          <p className="font-mono text-xs text-[#D9C5B2] uppercase tracking-wider mb-3">
            Upcoming
          </p>
          <div className="flex flex-col gap-3">
            {upcoming.map(t => (
              <TicketCard
                key={t.id}
                ticket={t}
                onClick={() => setSelected(t)}
                tactical={isTactical}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category filter buttons */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={[
              'px-3 py-1.5 rounded-full font-mono text-xs whitespace-nowrap border transition-colors',
              filter === cat
                ? 'bg-[#E67E22] border-[#E67E22] text-white'
                : 'border-white/10 text-[#D9C5B2] hover:border-[#E67E22]/50',
            ].join(' ')}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-4xl">🎫</span>
          <p className="font-playfair text-lg text-[#D9C5B2]">
            No tickets in your Vault
          </p>
          <p className="font-mono text-xs text-[#D9C5B2]/60">
            Add flights, passes, and confirmations to keep them at your fingertips.
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="mt-2 px-5 py-2 rounded-lg font-mono text-sm bg-[#E67E22] text-white"
          >
            Add First Ticket
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => setSelected(t)}
              tactical={isTactical}
            />
          ))}
        </div>
      )}

      {/* Floating action button — only when tickets exist */}
      {filtered.length > 0 && (
        <button
          onClick={() => setImportOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105"
          style={{ background: '#E67E22', color: 'white' }}
          aria-label="Add ticket"
        >
          +
        </button>
      )}

      {/* Detail drawer */}
      <TicketDetailDrawer ticket={selected} onClose={() => setSelected(null)} />

      {/* Import modal */}
      <TicketImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
