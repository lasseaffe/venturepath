'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/useWizardStore'
import { generatePackingList, CATEGORIES as PACKING_CATEGORIES } from '@/utils/packingLogic'
import { nanoid } from 'nanoid'

// Category labels from packingLogic CATEGORIES constant
const CATEGORY_LABELS = Object.values(PACKING_CATEGORIES)
const CUSTOM_CATEGORY = 'Misc'
const ALL_CATS = [...CATEGORY_LABELS, CUSTOM_CATEGORY]

function fallbackPackingList(climate, days) {
  const base = [
    { name: 'Passport', category: 'Base Camp' },
    { name: 'Travel insurance', category: 'Base Camp' },
    { name: 'First aid kit', category: 'Medical' },
    { name: 'Phone charger', category: 'Tech & Power' },
    { name: 'Sunscreen', category: 'Base Camp' },
  ]
  if (climate === 'alpine' || climate === 'arctic') {
    base.push({ name: 'Thermal base layers', category: 'Clothing' })
    base.push({ name: 'Waterproof jacket', category: 'Clothing' })
  }
  if (climate === 'tropical') {
    base.push({ name: 'Rain poncho', category: 'Shelter & Sleep' })
    base.push({ name: 'Insect repellent', category: 'Medical' })
  }
  if (days > 7) base.push({ name: 'Laundry bag', category: 'Base Camp' })
  return base
}

export default function PackingStep({ onNext }) {
  const { climate, days, squad, packingList, setPackingList, togglePackingItem, assignPackingItem, setStep } = useWizardStore()
  const [newItemName, setNewItemName] = useState('')
  const [newItemCat, setNewItemCat] = useState(CUSTOM_CATEGORY)
  const [addingItem, setAddingItem] = useState(false)

  useEffect(() => { setStep('packing') }, [setStep])

  useEffect(() => {
    if (packingList.length > 0) return

    let items = []
    try {
      const result = generatePackingList({ climate: climate || 'temperate', days: days || 7 })
      if (result && Array.isArray(result.items) && result.items.length > 0) {
        items = result.items.map((item) => ({
          id: nanoid(),
          sourceId: item.id,
          name: item.label || item.name || 'Item',
          category: item.category || CUSTOM_CATEGORY,
          weight: item.weight ?? 0,
          critical: item.critical ?? false,
          checked: false,
          assignedTo: null,
        }))
      }
    } catch {
      items = []
    }

    if (items.length === 0) {
      items = fallbackPackingList(climate || 'temperate', days || 7).map((item) => ({
        id: nanoid(),
        sourceId: null,
        name: item.name,
        category: item.category,
        weight: 0,
        critical: false,
        checked: false,
        assignedTo: null,
      }))
    }

    setPackingList(items)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addCustomItem = () => {
    if (!newItemName.trim()) return
    setPackingList([
      ...packingList,
      {
        id: nanoid(),
        sourceId: null,
        name: newItemName.trim(),
        category: newItemCat,
        weight: 0,
        critical: false,
        checked: false,
        assignedTo: null,
      },
    ])
    setNewItemName('')
    setAddingItem(false)
  }

  const grouped = ALL_CATS.reduce((acc, cat) => {
    acc[cat] = packingList.filter((i) => {
      if (cat === CUSTOM_CATEGORY) return !CATEGORY_LABELS.includes(i.category)
      return i.category === cat
    })
    return acc
  }, {})

  const checkedCount = packingList.filter((i) => i.checked).length
  const totalWeight = packingList.reduce((sum, i) => sum + (i.weight ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Gear Up</h2>
          <p className="text-[#D9C5B2] text-sm">Climate-suggested packing list. Uncheck what you don&apos;t need.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono text-[#D9C5B2]">{checkedCount}/{packingList.length} packed</p>
          {totalWeight > 0 && (
            <p className="text-xs font-mono text-[#D9C5B2]/60 mt-0.5">{totalWeight.toFixed(1)} kg total</p>
          )}
        </div>
      </div>

      {ALL_CATS.map((cat) => {
        const items = grouped[cat]
        if (!items || items.length === 0) return null
        return (
          <div key={cat}>
            <p className="text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">{cat}</p>
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 bg-[#141820] border rounded transition-colors ${item.critical && !item.checked ? 'border-[#E67E22]/30' : 'border-white/5'}`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => togglePackingItem(item.id)}
                    className="w-4 h-4 accent-[#E67E22] cursor-pointer flex-shrink-0"
                  />
                  <span className={`flex-1 text-sm transition-colors ${item.checked ? 'text-[#D9C5B2]/50 line-through' : 'text-white'}`}>
                    {item.name}
                    {item.critical && !item.checked && (
                      <span className="ml-2 text-[10px] font-mono text-[#E67E22] uppercase tracking-wider">critical</span>
                    )}
                  </span>
                  {item.weight > 0 && (
                    <span className="text-xs font-mono text-[#D9C5B2]/40 flex-shrink-0">{item.weight}kg</span>
                  )}
                  {squad.length > 1 && (
                    <select
                      value={item.assignedTo || ''}
                      onChange={(e) => assignPackingItem(item.id, e.target.value || null)}
                      className="bg-[#0E1012] border border-white/10 rounded px-2 py-1 text-xs text-[#D9C5B2] focus:outline-none focus:border-[#E67E22]/60"
                    >
                      <option value="">Unassigned</option>
                      {squad.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {addingItem ? (
        <div className="flex gap-2 p-3 bg-[#141820] border border-[#E67E22]/30 rounded flex-wrap">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
            placeholder="Item name..."
            className="flex-1 min-w-[160px] bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E67E22]/60"
          />
          <select
            value={newItemCat}
            onChange={(e) => setNewItemCat(e.target.value)}
            className="bg-[#0E1012] border border-white/10 rounded px-2 py-2 text-white text-sm focus:outline-none"
          >
            {ALL_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={addCustomItem}
            className="px-4 py-2 text-sm font-mono bg-[#E67E22] text-[#0E1012] rounded font-semibold hover:bg-[#d4711f] transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => setAddingItem(false)}
            className="px-3 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded hover:border-white/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="w-full py-3 border border-dashed border-white/20 rounded text-[#D9C5B2] text-sm font-mono hover:border-[#E67E22]/40 hover:text-[#E67E22] transition-colors"
        >
          + Add Custom Item
        </button>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
