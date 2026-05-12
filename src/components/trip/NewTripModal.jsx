import { useState, useEffect, useRef } from 'react';
;
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { filterDestinations } from '../../utils/destinationEngine';
import { searchLocations } from '../../utils/geocodeEngine';

const CLIMATES = ['temperate', 'tropical', 'alpine', 'arctic', 'desert'];

export default function NewTripModal({ onClose, onCreated, initialData = null, expeditionId = null, onSaveExpedition = null, currentExpedition = null }) {
  const { createTrip, updateTrip, trip, legs, objectives, manifestSettings } = useTripStore();
  const isEdit = !!initialData;

  const [destination, setDestination] = useState(initialData?.destination ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialData?.endDate ?? '');
  const [climate, setClimate] = useState(initialData?.climate ?? 'temperate');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const debounce = useRef(null);

  // Auto-derive trip name from destination if not manually set
  const nameEdited = useRef(isEdit);

  useEffect(() => {
    if (!destination.trim()) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      // Try curated list first
      const curated = filterDestinations({}).filter(d =>
        d.name.toLowerCase().includes(destination.toLowerCase())
      );
      const curatedItems = curated.slice(0, 3).map(d => ({
        id: d.id, name: d.name, address: d.name, climate: d.climate, coords: d.coords,
      }));
      // Fill remaining slots with Nominatim
      const geo = curatedItems.length < 5
        ? await searchLocations(destination, 5 - curatedItems.length)
        : [];
      const geoItems = geo.map(r => ({
        id: String(r.id), name: r.name, address: r.address, climate: null, coords: r.coords,
      }));
      setSuggestions([...curatedItems, ...geoItems]);
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [destination]);

  function pickSuggestion(s) {
    setDestination(s.name);
    if (!nameEdited.current) setName(`My ${s.name} Trip`);
    if (s.climate) setClimate(s.climate);
    setSuggestions([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!destination.trim() || !name.trim()) return;
    const data = { name: name.trim(), destination: destination.trim(), startDate, endDate, climate };

    let resolvedId = null;
    if (isEdit) {
      updateTrip(data);
      if (onSaveExpedition && currentExpedition) {
        resolvedId = currentExpedition.id;
        onSaveExpedition({
          ...currentExpedition,
          trip: { ...currentExpedition.trip, ...data },
        });
      }
    } else {
      createTrip(data);
      const days = startDate && endDate
        ? Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000)
        : 0;
      if (onSaveExpedition) {
        resolvedId = crypto.randomUUID();
        onSaveExpedition({
          id: resolvedId,
          trip: { name: data.name, destination: data.destination, startDate, endDate, days, climate, status: 'PLANNING' },
          legs: [],
          objectives: [],
          manifestSettings: { climate, days, hasChildren: false },
        });
      }
    }
    onCreated?.(resolvedId);
    onClose();
  }

  const days = startDate && endDate
    ? Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-editorial text-xl" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit trip' : 'Plan a new trip'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isEdit ? 'Update trip details below.' : 'Where are you headed?'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Wizard entry split */}
          {!isEdit && !showQuickCreate && (
            <div className="flex gap-3 mb-6 p-4 bg-[#0E1012] rounded-lg border border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors text-sm"
              >
                ✦ Plan with Guide
              </button>
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="flex-1 py-3 px-4 border border-white/20 text-[#D9C5B2] font-mono rounded hover:border-white/40 transition-colors text-sm"
              >
                Quick Create
              </button>
            </div>
          )}

          {/* Destination */}
          <div className="relative">
            <label className="label-tag block mb-1.5">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={e => { setDestination(e.target.value); nameEdited.current = false; }}
              placeholder="e.g. Kyoto, Iceland Ring Road…"
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {suggestions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-raised)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.address !== s.name && (
                          <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.address}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            {searching && (
              <div className="absolute right-3 top-8 text-xs" style={{ color: 'var(--text-muted)' }}>searching…</div>
            )}
          </div>

          {/* Trip name */}
          <div>
            <label className="label-tag block mb-1.5">Trip name</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); nameEdited.current = true; }}
              placeholder="e.g. Summer in Japan"
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-tag block mb-1.5">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
          {days !== null && days >= 0 && (
            <p className="text-xs -mt-1" style={{ color: 'var(--text-muted)' }}>{days} day{days !== 1 ? 's' : ''}</p>
          )}

          {/* Climate */}
          <div>
            <label className="label-tag block mb-1.5">Climate</label>
            <div className="flex flex-wrap gap-2">
              {CLIMATES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClimate(c)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                  style={{
                    background: climate === c ? 'var(--cta)' : 'var(--surface-raised)',
                    color: climate === c ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${climate === c ? 'var(--cta)' : 'var(--border)'}`,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm transition-colors"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: 'var(--cta)' }}
            >
              {isEdit ? 'Save changes' : 'Start planning →'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
