import { createContext, useContext, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { SEARCH_STRATEGIES } from '../utils/searchStrategies';

const SearchContext = createContext(null);

export function SearchProvider({ activeTab, children }) {
  const { trip, userRole } = useTripStore();

  const strategy = SEARCH_STRATEGIES[activeTab] ?? SEARCH_STRATEGIES.DEFAULT;

  const value = useMemo(() => ({
    activeTab,
    destination: trip.destination,
    userRole,
    strategy,
    climate: trip.climate,
  }), [activeTab, trip.destination, userRole, strategy, trip.climate]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearchContext must be used within SearchProvider');
  return ctx;
}
