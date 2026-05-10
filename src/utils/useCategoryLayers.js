import { useState, useEffect, useCallback, useRef } from 'react';
import { loadLayers, saveLayers } from './categoryLayerStore';
import { CATEGORY_IDS } from './poiCategories';
import sentinelBus from './sentinelBus';
import { LAYER_TOGGLED } from './sentinelBusEvents';

export function useCategoryLayers() {
  const [activeLayers, setActiveLayers] = useState(() => new Set(CATEGORY_IDS));
  const [presets, setPresets]           = useState([]);
  const [loaded, setLoaded]             = useState(false);
  const activeLayersRef                 = useRef(new Set(CATEGORY_IDS));

  // Load from IndexedDB on mount
  useEffect(() => {
    loadLayers().then(({ activeLayers: ids, presets: p }) => {
      const s = new Set(ids);
      setActiveLayers(s);
      activeLayersRef.current = s;
      setPresets(p);
      setLoaded(true);
    });
  }, []);

  // Persist whenever state changes (skip until loaded)
  useEffect(() => {
    if (!loaded) return;
    saveLayers([...activeLayers], presets);
  }, [activeLayers, presets, loaded]);

  // Keep ref in sync for savePreset to read without stale closure
  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);

  const toggle = useCallback((categoryId) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      sentinelBus.emit(LAYER_TOGGLED, { activeLayers: [...next] });
      return next;
    });
  }, []);

  const savePreset = useCallback((name) => {
    if (!name?.trim()) return;
    const preset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      activeLayers: [...activeLayersRef.current],
      createdAt: Date.now(),
    };
    setPresets(prev => [...prev, preset]);
  }, []);

  const loadPreset = useCallback((presetId) => {
    setPresets(prev => {
      const preset = prev.find(p => p.id === presetId);
      if (preset) {
        const s = new Set(preset.activeLayers);
        setActiveLayers(s);
        activeLayersRef.current = s;
      }
      return prev;
    });
  }, []);

  const deletePreset = useCallback((presetId) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  const isActive = useCallback((categoryId) => activeLayers.has(categoryId), [activeLayers]);

  return { activeLayers, presets, toggle, savePreset, loadPreset, deletePreset, isActive };
}
