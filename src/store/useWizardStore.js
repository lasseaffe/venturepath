// src/store/useWizardStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_STATE = {
  wizardVersion: 1,
  currentStep: 'welcome',
  startedAt: null,
  destination: null,       // { name, lat, lng, country }
  startDate: null,
  endDate: null,
  days: 0,
  climate: null,
  squad: [],               // [{ id, name, role, inviteLink }]
  tickets: [],             // [{ id, from, to, date, mode, confirmationCode }]
  nothingBooked: false,
  accommodation: [],       // [{ id, legIndex, type, name, checkIn, checkOut, confirmation }]
  stops: [],               // [{ id, name, lat, lng, intensity, duration, type }]
  itineraryGrid: {},       // { [dayIndex]: { morning, afternoon, evening } }
  aiSuggestion: null,      // { narrative, proposedGrid, conflicts }
  budget: {
    ceiling: 0,
    currency: 'USD',
    splits: { accommodation: 30, transport: 25, food: 25, activities: 15, emergency: 5 },
  },
  packingList: [],         // [{ id, name, category, checked, assignedTo }]
  readinessScore: null,    // { route, squad, logistics, budget, packing, overall }
}

export const useWizardStore = create(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setStep: (step) => set({ currentStep: step }),

      setDestination: (destination) => set({ destination }),
      setDates: (startDate, endDate) => {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const days = Math.max(1, Math.round((end - start) / 86400000))
        set({ startDate, endDate, days })
      },
      setClimate: (climate) => set({ climate }),

      setSquad: (squad) => set({ squad }),
      addSquadMember: (member) => set((s) => ({ squad: [...s.squad, member] })),
      removeSquadMember: (id) => set((s) => ({ squad: s.squad.filter((m) => m.id !== id) })),

      setTickets: (tickets) => set({ tickets }),
      addTicket: (ticket) => set((s) => ({ tickets: [...s.tickets, ticket] })),
      removeTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) })),
      setNothingBooked: (val) => set({ nothingBooked: val }),

      setAccommodation: (accommodation) => set({ accommodation }),
      updateAccommodation: (id, patch) =>
        set((s) => ({
          accommodation: s.accommodation.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      setStops: (stops) => set({ stops }),
      addStop: (stop) => set((s) => ({ stops: [...s.stops, stop] })),
      removeStop: (id) =>
        set((s) => ({
          stops: s.stops.filter((st) => st.id !== id),
          itineraryGrid: clearStopFromGrid(s.itineraryGrid, id),
        })),
      updateStop: (id, patch) =>
        set((s) => ({ stops: s.stops.map((st) => (st.id === id ? { ...st, ...patch } : st)) })),

      setItineraryGrid: (grid) => set({ itineraryGrid: grid }),
      placeStop: (dayIndex, slot, stopId) =>
        set((s) => ({
          itineraryGrid: {
            ...s.itineraryGrid,
            [dayIndex]: { ...(s.itineraryGrid[dayIndex] || {}), [slot]: stopId },
          },
        })),
      setAiSuggestion: (aiSuggestion) => set({ aiSuggestion }),

      setBudget: (budget) => set({ budget }),
      setBudgetSplit: (category, value) =>
        set((s) => ({
          budget: { ...s.budget, splits: { ...s.budget.splits, [category]: value } },
        })),

      setPackingList: (packingList) => set({ packingList }),
      togglePackingItem: (id) =>
        set((s) => ({
          packingList: s.packingList.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        })),
      assignPackingItem: (id, assignedTo) =>
        set((s) => ({
          packingList: s.packingList.map((item) =>
            item.id === id ? { ...item, assignedTo } : item
          ),
        })),

      setReadinessScore: (readinessScore) => set({ readinessScore }),

      resetWizard: () => set({ ...DEFAULT_STATE }),
    }),
    { name: 'vp-wizard-store', version: 1 }
  )
)

function clearStopFromGrid(grid, stopId) {
  const result = {}
  for (const [day, slots] of Object.entries(grid)) {
    result[day] = {}
    for (const [slot, id] of Object.entries(slots)) {
      if (id !== stopId) result[day][slot] = id
    }
  }
  return result
}
