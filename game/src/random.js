// A tiny seeded generator (mulberry32) so a level's patrol jitter and a
// screenshot's staged scene play the same way every time for one seed.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element of an array with the seeded generator.
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
