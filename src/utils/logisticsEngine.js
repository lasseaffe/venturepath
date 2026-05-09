const MILES_PER_KM = 0.621371;

export function calculateLegLogistics(distanceKm, vehicle, fuelPrice) {
  const miles = distanceKm * MILES_PER_KM;
  const quantity = vehicle.type === 'EV'
    ? (miles / 100) * vehicle.efficiency   // kWh per 100 miles
    : miles / vehicle.efficiency;          // MPG

  return {
    cost:        parseFloat((quantity * fuelPrice).toFixed(2)),
    units:       vehicle.type === 'EV' ? 'kWh' : 'Gallons',
    quantity:    parseFloat(quantity.toFixed(1)),
    needsRefuel: miles > vehicle.range * 0.85,
    miles:       parseFloat(miles.toFixed(1)),
  };
}

export function formatExpeditionCost(cost) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost);
}
