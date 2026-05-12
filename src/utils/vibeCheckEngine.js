import { generateVibes } from './osmEngine.js'

// Thin re-export — consumers use fetchVibes(city) same as before
export async function fetchVibes(city) {
  return generateVibes(city)
}
