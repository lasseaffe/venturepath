import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

describe('osmEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('geocodeCity returns lat/lon/bbox for a valid city', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: '48.8566', lon: '2.3522', boundingbox: ['48.8155', '48.9022', '2.2242', '2.4699'] }
      ]
    })
    const { geocodeCity } = await import('./osmEngine.js')
    const result = await geocodeCity('Paris')
    expect(result.lat).toBeCloseTo(48.8566)
    expect(result.lon).toBeCloseTo(2.3522)
    expect(result.bbox).toHaveLength(4)
  })

  it('geocodeCity returns null for unknown city', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    const { geocodeCity } = await import('./osmEngine.js')
    const result = await geocodeCity('xyzunknowncity')
    expect(result).toBeNull()
  })

  it('searchAccommodation returns shaped place objects', async () => {
    // geocode call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: '48.8566', lon: '2.3522', boundingbox: ['48.8155', '48.9022', '2.2242', '2.4699'] }
      ]
    })
    // overpass call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 48.86, lon: 2.35, tags: { name: 'Hotel Lumière', tourism: 'hotel', stars: '4' } },
          { type: 'node', id: 2, lat: 48.87, lon: 2.36, tags: { name: 'Hostel Central', tourism: 'hostel' } }
        ]
      })
    })
    const { searchAccommodation } = await import('./osmEngine.js')
    const results = await searchAccommodation('Paris', 'all')
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ id: '1', name: 'Hotel Lumière', lat: 48.86, lon: 2.35 })
  })
})
