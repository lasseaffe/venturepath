import { useRef, useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploader({ legId }) {
  const { addPhoto } = useTripStore();
  const inputRef = useRef(null);
  const [urlValue, setUrlValue] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = await fileToBase64(file);
      addPhoto(legId, { id: makeId(), url, caption: '', source: 'upload', order: Date.now() });
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  function handleUrlSubmit(e) {
    e.preventDefault();
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    addPhoto(legId, { id: makeId(), url: trimmed, caption: '', source: 'link', order: Date.now() });
    setUrlValue('');
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? 'var(--ember)' : 'var(--border)',
          background: dragging ? 'rgba(230,126,34,0.05)' : 'transparent',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Drop photos here or click to upload
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
      </div>

      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          value={urlValue}
          onChange={e => setUrlValue(e.target.value)}
          placeholder="Or paste a photo URL…"
          className="flex-1 text-sm px-3 py-2 rounded border font-mono"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={!urlValue.trim()}
          className="px-3 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors"
          style={{
            background: urlValue.trim() ? 'var(--ember)' : 'var(--border)',
            color: '#fff',
          }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
