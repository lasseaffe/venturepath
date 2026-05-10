// src/components/itinerary/BlockHub.jsx
import { useState } from 'react';

const TABS = ['DETAILS', 'ITEMS', 'LINKS', 'CONTACTS'];
const CONTACT_ROLES = ['DRIVER', 'GUIDE', 'HOST', 'OTHER'];

const inputCls = "bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#E67E22] w-full";
const labelCls = "text-[9px] font-mono tracking-widest text-slate-500 uppercase mb-0.5";

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={labelCls}>{label}</div>
      {children}
    </div>
  );
}

function CheckItem({ text, done, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-2 py-0.5 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onToggle}
        className="w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center transition-colors"
        style={{ borderColor: done ? '#E67E22' : '#2a2f36', background: done ? '#E67E22' : 'transparent' }}
      >
        {done && <span className="text-[8px] text-[#0E1012] font-bold">✓</span>}
      </button>
      <span
        className="text-[11px] font-mono flex-1"
        style={{ color: done ? '#374151' : '#94A3B8', textDecoration: done ? 'line-through' : 'none' }}
      >
        {text}
      </span>
      {hovered && (
        <button onClick={onDelete} className="text-[9px] text-slate-600 hover:text-red-400 transition-colors shrink-0">✕</button>
      )}
    </div>
  );
}

function AddItemRow({ onAdd, placeholder = 'Add item…' }) {
  const [val, setVal] = useState('');
  function commit() {
    if (val.trim()) { onAdd(val.trim()); setVal(''); }
  }
  return (
    <div className="flex gap-1 mt-1">
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && commit()}
        placeholder={placeholder}
        className={inputCls + ' flex-1'}
      />
      <button
        onClick={commit}
        disabled={!val.trim()}
        className="text-[9px] font-mono px-2 rounded transition-colors disabled:opacity-30"
        style={{ background: '#E67E22', color: '#0E1012' }}
      >
        +
      </button>
    </div>
  );
}

function DetailsTab({ block, onPatch }) {
  const isAccommodation = block.category === 'accommodation';
  return (
    <div className="flex flex-col gap-2.5 p-2">
      <FieldRow label="Location">
        <input
          defaultValue={block.location ?? ''}
          onBlur={e => onPatch({ location: e.target.value })}
          placeholder="Place name…"
          className={inputCls}
        />
      </FieldRow>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label={isAccommodation ? 'Nights' : 'Duration (min)'}>
          <input
            defaultValue={block.duration ?? ''}
            onBlur={e => onPatch({ duration: e.target.value ? Number(e.target.value) : undefined })}
            type="number"
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="Booking ref">
          <input
            defaultValue={block.bookingRef ?? ''}
            onBlur={e => onPatch({ bookingRef: e.target.value })}
            placeholder="ABC-123"
            className={inputCls}
          />
        </FieldRow>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Cost">
          <div className="flex items-center gap-1">
            <input
              defaultValue={block.cost ?? ''}
              onBlur={e => onPatch({ cost: e.target.value ? Number(e.target.value) : undefined })}
              type="number"
              placeholder="0"
              className={inputCls}
            />
            <span className="text-[9px] font-mono text-slate-600 shrink-0">VP$</span>
          </div>
        </FieldRow>
        <FieldRow label="Alert time">
          <input
            defaultValue={block.alertTime ?? ''}
            onBlur={e => onPatch({ alertTime: e.target.value })}
            type="time"
            className={inputCls}
          />
        </FieldRow>
      </div>
      <FieldRow label="Notes">
        <textarea
          defaultValue={block.notes ?? ''}
          onBlur={e => onPatch({ notes: e.target.value })}
          placeholder="Field notes…"
          rows={2}
          className={inputCls + ' resize-none'}
        />
      </FieldRow>
    </div>
  );
}

function ItemsTab({ block, onPatch }) {
  const [subTab, setSubTab] = useState('BRING');
  const items = block.items ?? [];
  const subtasks = block.subtasks ?? [];

  function toggleItem(idx, field) {
    const arr = field === 'items' ? [...items] : [...subtasks];
    arr[idx] = { ...arr[idx], done: !arr[idx].done };
    onPatch({ [field]: arr });
  }
  function deleteItem(idx, field) {
    const arr = field === 'items' ? [...items] : [...subtasks];
    arr.splice(idx, 1);
    onPatch({ [field]: arr });
  }
  function addItem(text, field) {
    const arr = field === 'items' ? [...items] : [...subtasks];
    onPatch({ [field]: [...arr, { text, done: false }] });
  }

  const activeField = subTab === 'BRING' ? 'items' : 'subtasks';
  const activeArr = subTab === 'BRING' ? items : subtasks;

  return (
    <div className="p-2 flex flex-col gap-2">
      <div className="flex gap-1">
        {['BRING', 'TASKS'].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="text-[9px] font-mono px-2 py-0.5 rounded transition-colors"
            style={{
              background: subTab === t ? '#E67E22' : 'transparent',
              color: subTab === t ? '#0E1012' : '#64748B',
              border: `1px solid ${subTab === t ? '#E67E22' : '#2a2f36'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {activeArr.map((item, i) => (
          <CheckItem
            key={i}
            text={item.text}
            done={item.done}
            onToggle={() => toggleItem(i, activeField)}
            onDelete={() => deleteItem(i, activeField)}
          />
        ))}
      </div>
      <AddItemRow onAdd={text => addItem(text, activeField)} placeholder={subTab === 'BRING' ? 'Thing to bring…' : 'Task to complete…'} />
    </div>
  );
}

function LinksTab({ block, onPatch }) {
  const [labelVal, setLabelVal] = useState('');
  const [urlVal, setUrlVal] = useState('');
  const links = block.links ?? [];

  function addLink() {
    if (!labelVal.trim() || !urlVal.trim()) return;
    onPatch({ links: [...links, { label: labelVal.trim(), url: urlVal.trim() }] });
    setLabelVal(''); setUrlVal('');
  }
  function deleteLink(idx) {
    const next = [...links]; next.splice(idx, 1); onPatch({ links: next });
  }

  return (
    <div className="p-2 flex flex-col gap-2">
      {links.map((lk, i) => (
        <div key={i} className="flex items-center gap-1.5 group">
          <span className="text-[11px] font-mono text-slate-300 flex-1 truncate">{lk.label}</span>
          <span className="text-[9px] text-slate-600 font-mono">→</span>
          <a
            href={lk.url} target="_blank" rel="noreferrer"
            className="text-[9px] font-mono text-[#E67E22] hover:underline truncate max-w-[100px]"
          >
            {lk.url.replace(/^https?:\/\//, '')}
          </a>
          <span className="text-[9px] text-slate-500">↗</span>
          <button onClick={() => deleteLink(i)} className="text-[9px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">✕</button>
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        <input value={labelVal} onChange={e => setLabelVal(e.target.value)} placeholder="Label" className={inputCls} style={{ flex: '0 0 80px' }} />
        <input value={urlVal} onChange={e => setUrlVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="https://…" className={inputCls + ' flex-1'} />
        <button onClick={addLink} disabled={!labelVal.trim() || !urlVal.trim()} className="text-[9px] font-mono px-2 rounded disabled:opacity-30" style={{ background: '#E67E22', color: '#0E1012' }}>+</button>
      </div>
    </div>
  );
}

function ContactsTab({ block, onPatch }) {
  const [nameVal, setNameVal] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [roleVal, setRoleVal] = useState('OTHER');
  const contacts = block.contacts ?? [];

  function addContact() {
    if (!nameVal.trim()) return;
    onPatch({ contacts: [...contacts, { name: nameVal.trim(), phone: phoneVal.trim(), role: roleVal }] });
    setNameVal(''); setPhoneVal(''); setRoleVal('OTHER');
  }
  function deleteContact(idx) {
    const next = [...contacts]; next.splice(idx, 1); onPatch({ contacts: next });
  }

  const roleBadgeColor = { DRIVER: '#60A5FA', GUIDE: '#4ADE80', HOST: '#A78BFA', OTHER: '#94A3B8' };

  return (
    <div className="p-2 flex flex-col gap-2">
      {contacts.map((c, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: roleBadgeColor[c.role] ?? '#94A3B8', border: `1px solid ${roleBadgeColor[c.role] ?? '#94A3B8'}40` }}>{c.role}</span>
          <span className="text-[11px] font-mono text-slate-200 flex-1">{c.name}</span>
          {c.phone && <span className="text-[10px] font-mono text-slate-500">{c.phone}</span>}
          <button onClick={() => deleteContact(i)} className="text-[9px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">✕</button>
        </div>
      ))}
      <div className="flex gap-1 mt-1 flex-wrap">
        <input value={nameVal} onChange={e => setNameVal(e.target.value)} placeholder="Name" className={inputCls} style={{ flex: '1 1 80px' }} />
        <input value={phoneVal} onChange={e => setPhoneVal(e.target.value)} placeholder="Phone" className={inputCls} style={{ flex: '1 1 80px' }} />
        <select value={roleVal} onChange={e => setRoleVal(e.target.value)} className={inputCls} style={{ flex: '0 0 80px' }}>
          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={addContact} disabled={!nameVal.trim()} className="text-[9px] font-mono px-2 rounded disabled:opacity-30" style={{ background: '#E67E22', color: '#0E1012' }}>+</button>
      </div>
    </div>
  );
}

export default function BlockHub({ block, onPatch, activeTab, onTabChange }) {
  return (
    <div style={{ borderTop: '1px solid #1e2328' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 pt-2">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="text-[9px] font-mono tracking-widest px-2 py-0.5 transition-colors"
            style={{ color: activeTab === tab ? '#E67E22' : '#374151' }}
          >
            {tab}{i < TABS.length - 1 && <span className="ml-2 text-[#1e2328]">·</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'DETAILS'  && <DetailsTab block={block} onPatch={onPatch} />}
      {activeTab === 'ITEMS'    && <ItemsTab block={block} onPatch={onPatch} />}
      {activeTab === 'LINKS'    && <LinksTab block={block} onPatch={onPatch} />}
      {activeTab === 'CONTACTS' && <ContactsTab block={block} onPatch={onPatch} />}
    </div>
  );
}
