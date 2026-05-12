import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS } from './itineraryConstants';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import ImageAttribution from '../ui/ImageAttribution';
import BlockHub from './BlockHub';

const inputCls = "bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#E67E22] w-full";

function HeroZone({ block, tripName, onClose }) {
  const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;
  const { image, loading } = useDestinationImage(block.title || tripName, 'poi', 3);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative shrink-0"
      style={{
        height: 200,
        background: image?.url && imgLoaded
          ? undefined
          : `linear-gradient(135deg, ${colors.dot}22, ${colors.dot}08)`,
      }}
    >
      {image?.url && (
        <img
          src={image.url}
          alt={block.title}
          onLoad={() => setImgLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 300ms ease' }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.2) 0%, rgba(14,16,18,0.75) 100%)' }}
      />

      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-10 w-7 h-7 flex items-center justify-center rounded font-mono text-white/70 hover:text-white hover:bg-black/40 transition-colors text-sm"
      >
        ✕
      </button>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {block.time && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: '#E67E22' }}>
            {block.time}
          </span>
        )}
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded tracking-widest uppercase"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {block.category}
        </span>
      </div>

      <div className="absolute bottom-3 left-4 right-4 z-10">
        <p
          className="font-editorial text-xl text-white leading-tight"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          {block.title}
        </p>
      </div>

      {image?.author && (
        <div className="absolute bottom-1 right-2 z-10">
          <ImageAttribution attribution={image} />
        </div>
      )}
    </div>
  );
}

function EditableHeader({ block, onPatch }) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitleDraft(block.title);
    setEditing(false);
  }, [block.id]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== block.title) onPatch({ title: trimmed });
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #1e2328' }}>
      {editing ? (
        <input
          ref={inputRef}
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditing(false); }}
          className="font-editorial text-lg text-white bg-transparent border-b border-[#E67E22] focus:outline-none w-full pb-0.5"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="font-editorial text-lg text-white cursor-text hover:text-[#E67E22] transition-colors"
          title="Click to edit"
        >
          {block.title}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Time</span>
          <input
            defaultValue={block.time ?? ''}
            onBlur={e => onPatch({ time: e.target.value })}
            type="time"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Category</span>
          <select
            defaultValue={block.category}
            onChange={e => onPatch({ category: e.target.value })}
            className={inputCls}
          >
            {Object.keys(CATEGORY_COLORS).filter(k => k !== 'default').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Duration (min)</span>
          <input
            defaultValue={block.duration ?? ''}
            onBlur={e => onPatch({ duration: e.target.value ? Number(e.target.value) : undefined })}
            type="number"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

export default function StopDrawer({ block, onPatch, onClose, onRemove, tripName }) {
  const [activeTab, setActiveTab] = useState('DETAILS');

  useEffect(() => { setActiveTab('DETAILS'); }, [block?.id]);

  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!block) return null;

  function handlePatch(patch) {
    onPatch(block.id, patch);
  }

  function handleDelete() {
    onRemove(block.id);
    onClose();
  }

  return (
    <motion.div
      initial={{ x: 520, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 520, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
      style={{
        width: 520,
        background: '#0E1012',
        borderLeft: '1px solid #1e2328',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
      }}
    >
      <HeroZone block={block} tripName={tripName} onClose={onClose} />
      <EditableHeader block={block} onPatch={handlePatch} />
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <BlockHub
          block={block}
          onPatch={handlePatch}
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); }}
        />
      </div>
      <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid #1e2328' }}>
        <button
          onClick={handleDelete}
          className="w-full py-2 text-[10px] font-mono tracking-widest rounded border border-red-800/50 text-red-400 hover:bg-red-900/20 hover:border-red-700 transition-colors"
        >
          [DELETE STOP]
        </button>
      </div>
    </motion.div>
  );
}
