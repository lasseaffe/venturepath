// Merged from venture-path: flightEngine.js + flightScraper.js

export async function searchFlights(origin, destination, _date, priority = 'CHEAPEST') {
  // Replace with real Skyscanner/Amadeus API call when ready
  const mockFlights = [
    { id: 'f1', airline: 'Lufthansa',  route: `${origin} → ${destination}`, price: 542, duration: '7h 45m', co2: 120, type: 'Economy'  },
    { id: 'f2', airline: 'DirectJet',  route: `${origin} → ${destination}`, price: 890, duration: '2h 15m', co2: 210, type: 'Non-stop'  },
    { id: 'f3', airline: 'GreenFly',   route: `${origin} → ${destination}`, price: 620, duration: '4h 45m', co2: 85,  type: 'Eco'       },
  ];
  return filterExpeditionFlights(mockFlights, priority, Infinity);
}

export function filterExpeditionFlights(flights, priority, budget) {
  return [...flights]
    .filter(f => f.price <= budget)
    .sort((a, b) => {
      if (priority === 'CHEAPEST') return a.price - b.price;
      if (priority === 'GREENEST') return a.co2  - b.co2;
      if (priority === 'FASTEST')  return a.duration.localeCompare(b.duration);
      return 0;
    });
}

export function calculateFlightImpact(flight) {
  if (!flight) return null;
  return {
    co2Amount:  flight.co2,
    rating:     flight.co2 < 100 ? 'Low' : flight.co2 < 150 ? 'Medium' : 'High',
    offsetCost: (flight.co2 * 0.15).toFixed(2),
  };
}
