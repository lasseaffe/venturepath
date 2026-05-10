'use client'

import { useState, useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'
import { nanoid } from 'nanoid'

const ROLES = ['lead', 'scout', 'medic', 'quartermaster']
const ROLE_LABELS = { lead: 'Lead', scout: 'Scout', medic: 'Medic', quartermaster: 'Quartermaster' }
const ROLE_DESC = {
  lead: 'Calls the route, breaks ties',
  scout: 'Handles discovery and local intel',
  medic: 'First aid, health logistics',
  quartermaster: 'Manages gear and supplies',
}

export default function SquadStep({ onNext }) {
  const { squad, addSquadMember, removeSquadMember, setStep } = useWizardStore()
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('scout')
  const [copied, setCopied] = useState(null)

  useEffect(() => { setStep('squad') }, [setStep])

  const addMember = () => {
    if (!newName.trim()) return
    addSquadMember({
      id: nanoid(),
      name: newName.trim(),
      role: newRole,
      inviteLink: `https://venturepath.app/join/${nanoid(8)}`,
    })
    setNewName('')
  }

  const copyLink = (id, link) => {
    navigator.clipboard.writeText(link)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Assemble the Squad</h2>
        <p className="text-[#D9C5B2] text-sm">Who's joining this expedition? Add members or proceed solo.</p>
      </div>

      <div className="flex gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addMember()}
          placeholder="Pioneer name..."
          className="flex-1 bg-[#141820] border border-white/10 rounded px-4 py-3 text-white placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60 transition-colors"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="bg-[#141820] border border-white/10 rounded px-3 py-3 text-white focus:outline-none focus:border-[#E67E22]/60 transition-colors"
        >
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button
          onClick={addMember}
          className="px-5 py-3 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <div key={r} className="p-3 bg-[#141820] border border-white/5 rounded text-xs">
            <span className="text-[#E67E22] font-mono font-semibold">{ROLE_LABELS[r]}</span>
            <span className="text-[#D9C5B2] ml-2">{ROLE_DESC[r]}</span>
          </div>
        ))}
      </div>

      {squad.length > 0 && (
        <ul className="flex flex-col gap-2">
          {squad.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3 bg-[#141820] border border-white/10 rounded">
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{m.name}</p>
                <p className="text-[#D9C5B2] text-xs font-mono">{ROLE_LABELS[m.role]}</p>
              </div>
              <button
                onClick={() => copyLink(m.id, m.inviteLink)}
                className="text-xs font-mono px-3 py-1 border border-white/10 rounded text-[#D9C5B2] hover:border-[#E67E22]/60 hover:text-[#E67E22] transition-colors"
              >
                {copied === m.id ? '✓ Copied' : 'Invite Link'}
              </button>
              <button
                onClick={() => removeSquadMember(m.id)}
                className="text-[#D9C5B2]/40 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {squad.length === 0 && (
        <p className="text-center text-[#D9C5B2] text-sm py-4 border border-dashed border-white/10 rounded">
          No squad members added — proceeding as a solo Architect.
        </p>
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
