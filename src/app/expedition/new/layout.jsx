'use client'

import { TripStoreProvider } from '@/store/useTripStore'

export default function ExpeditionNewLayout({ children }) {
  return <TripStoreProvider>{children}</TripStoreProvider>
}
