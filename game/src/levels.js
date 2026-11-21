// The three floors of the Ember Vault, drawn as tile maps.
//   # wall (blocks movement and sight)   . floor
//   C crate (cover: blocks movement and sight)   B bush (hides a sneaking player)
//   S player start   E exit   * ember shard (loot)
// Guard patrols are waypoint lists in tile coordinates; a guard walks them
// in order, pauses at each end and scans before turning back.
export const LEVELS = [
  {
    name: 'The Gallery',
    intro: 'Slip past the night watch. Take all three ember shards, then reach the green door.',
    map: [
      '########################',
      '#......#......#........#',
      '#.S....#..*...#...B....#',
      '#......#......#........#',
      '#..C...#..C...#...C....#',
      '#......#......#........#',
      '###.##########.######..#',
      '#......#......#........#',
      '#.B....#..C...#...*....#',
      '#......#......#........#',
      '#..C...#......#...C....#',
      '#......#..B...#........#',
      '#...*..#......#....E...#',
      '#......#......#........#',
      '########################',
    ],
    guards: [
      { waypoints: [[10, 1], [10, 5]], pauseSec: 1.4 },
      { waypoints: [[20, 7], [20, 13]], pauseSec: 1.1 },
    ],
    lamps: [[4, 1], [18, 5], [4, 11], [20, 11]],
  },
  {
    name: 'Hall of Echoes',
    intro: 'Three guards now, and the floor is loud: sneak, or throw a pebble to pull them away.',
    map: [
      '########################',
      '#....B...#.....#.......#',
      '#.S......#..*..#...C...#',
      '#........#.....#.......#',
      '#..C.....#..C..#...B...#',
      '#........#.....#.......#',
      '####.#########.####.####',
      '#........#........#....#',
      '#...*....#...C....#..B.#',
      '#........#........#....#',
      '#.B......#....*...#....#',
      '#........#........#....#',
      '#...C....#........#..E.#',
      '#........#........#....#',
      '########################',
    ],
    guards: [
      { waypoints: [[11, 1], [11, 5]], pauseSec: 1.2 },
      { waypoints: [[1, 8], [8, 8]], pauseSec: 1.5 },
      { waypoints: [[20, 7], [20, 13]], pauseSec: 1.0 },
    ],
    lamps: [[12, 2], [5, 7], [18, 10], [12, 13]],
  },
  {
    name: 'The Vault',
    intro: 'The last floor. Four guards, tight cones, no room for a mistake.',
    map: [
      '########################',
      '#..B.....#....#....B...#',
      '#.S..C...#.*..#....*...#',
      '#........#....#........#',
      '#..C.....#....#..C.....#',
      '#........#....#........#',
      '###.#######.#####.####.#',
      '#........#....#........#',
      '#.B..*...#....#.C......#',
      '#........#....#...B....#',
      '#...C....#....#........#',
      '#........#....#........#',
      '#....B...#..C.#....E...#',
      '#........#....#........#',
      '########################',
    ],
    guards: [
      { waypoints: [[1, 3], [8, 3]], pauseSec: 1.0 },
      { waypoints: [[11, 1], [11, 5]], pauseSec: 1.2 },
      { waypoints: [[15, 9], [22, 9]], pauseSec: 1.4 },
      { waypoints: [[20, 7], [20, 13]], pauseSec: 1.0 },
    ],
    lamps: [[6, 2], [13, 5], [18, 8], [8, 12]],
  },
];

// Read one tile of a level map; anything outside the map is a wall.
export function tileAt(level, col, row) {
  if (row < 0 || row >= level.map.length) return '#';
  const line = level.map[row];
  if (col < 0 || col >= line.length) return '#';
  return line[col];
}

// A tile blocks movement when it is a wall or a crate.
export function blocksMove(tile) {
  return tile === '#' || tile === 'C';
}

// A tile blocks sight when it is a wall or a crate. Bushes never block sight.
export function blocksSight(tile) {
  return tile === '#' || tile === 'C';
}

// Find every tile of one kind in a level map, as {col, row} pairs.
export function findTiles(level, kind) {
  const found = [];
  level.map.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] === kind) found.push({ col, row });
    }
  });
  return found;
}
