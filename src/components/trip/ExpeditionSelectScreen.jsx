import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useExpeditionList } from '../../hooks/useExpeditionList';
import NewTripModal from './NewTripModal';

const CLIMATE_ICONS = {
  temperate: '🌿',
  tropical:  '🌴',
  alpine:    '⛰️',
  arctic:    '❄️',
  desert:    '🏜️',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExpeditionSelectScreen({ onEnter }) {
  const { trip, legs, objectives, manifestSettings, loadExpedition } = useTripStore();
  const { expeditions, saveExpedition, deleteExpedition } = useExpeditionList();
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // expedition id being edited
  const [confirmDelete, setConfirmDelete] = useState(null);

  function handleLoad(exp) {
    loadExpedition(exp);
    onEnter(exp.id);
  }

  function handleNew() {
    setEditTarget(null);
    setShowNew(true);
  }

  function handleEdit(exp, e) {
    e.stopPropagation();
    setEditTarget(exp);
    setShowNew(true);
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    setConfirmDelete(id);
  }

  function confirmDeleteExpedition() {
    deleteExpedition(confirmDelete);
    setConfirmDelete(null);
  }

  // Called by NewTripModal when a new trip is created or edited.
  // newId is the expedition id that was saved to the list.
  function handleCreated(newId) {
    setShowNew(false);
    setEditTarget(null);
    if (newId) onEnter(newId);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-5 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="font-editorial text-2xl" style={{ color: 'var(--text-primary)' }}>
            My Expeditions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Select an expedition to continue planning, or start a new one.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--cta)' }}
        >
          + New expedition
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        {expeditions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-4xl mb-3">🗺️</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No saved expeditions yet
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
              Create your first one and start planning.
            </p>
            <button
              onClick={handleNew}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: 'var(--cta)' }}
            >
              + New expedition
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {expeditions.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleLoad(exp)}
                  className="group relative rounded-2xl p-5 cursor-pointer transition-all"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--cta)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--cta)20';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Climate icon */}
                  <div className="text-3xl mb-3">
                    {CLIMATE_ICONS[exp.trip?.climate] ?? '🌍'}
                  </div>

                  <h2 className="font-semibold text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {exp.trip?.name ?? 'Untitled expedition'}
                  </h2>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {exp.trip?.destination ?? '—'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{exp.trip?.days ?? 0}d</span>
                    <span>·</span>
                    <span>{formatDate(exp.trip?.startDate)}</span>
                    {exp.legs?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{exp.legs.length} leg{exp.legs.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: 'var(--surface-raised)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {exp.trip?.status ?? 'PLANNING'}
                    </span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                      {exp.savedAt ? new Date(exp.savedAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleEdit(exp, e)}
                      title="Edit expedition details"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={e => handleDelete(exp.id, e)}
                      title="Delete expedition"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                      style={{ background: 'var(--surface-raised)', color: 'var(--status-alert)', border: '1px solid var(--border)' }}
                    >
                      🗑
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New / Edit trip modal */}
      <AnimatePresence>
        {showNew && (
          <NewTripModal
            initialData={editTarget?.trip ?? null}
            expeditionId={editTarget?.id ?? null}
            onClose={() => { setShowNew(false); setEditTarget(null); }}
            onCreated={handleCreated}
            onSaveExpedition={saveExpedition}
            currentExpedition={editTarget}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="font-editorial text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                Delete expedition?
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                This cannot be undone. All legs, objectives, and settings for this expedition will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteExpedition}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--status-alert)', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
