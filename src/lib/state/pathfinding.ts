/**
 * Simple A* pathfinding on a 2D grid.
 * 4-directional movement only (no diagonals).
 */

export interface GridCell {
  row: number;
  col: number;
}

interface Node {
  row: number;
  col: number;
  g: number; // cost from start
  h: number; // heuristic (Manhattan distance to end)
  f: number; // g + h
  parent: Node | null;
}

/** Manhattan distance heuristic. */
function heuristic(a: GridCell, b: GridCell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** 4-directional neighbours. */
const DIRS: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

/**
 * Compute shortest path from `start` to `end` on a grid, avoiding blocked cells.
 *
 * @param rows     Grid height
 * @param cols     Grid width
 * @param blocked  Set of "row,col" keys that are impassable
 * @param start    Start cell
 * @param end      Goal cell
 * @returns Array of {row, col} steps from start to end (inclusive), or [] if no path.
 */
export function findPath(
  rows: number,
  cols: number,
  blocked: Set<string>,
  start: GridCell,
  end: GridCell,
): GridCell[] {
  // Same cell — no movement needed
  if (start.row === end.row && start.col === end.col) {
    return [{ row: start.row, col: start.col }];
  }

  // Goal is blocked or out of bounds — no path
  if (
    end.row < 0 || end.row >= rows ||
    end.col < 0 || end.col >= cols ||
    blocked.has(cellKey(end.row, end.col))
  ) {
    return [];
  }

  const startNode: Node = {
    row: start.row,
    col: start.col,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  // Open list (simple array — fine for small office grids)
  const open: Node[] = [startNode];
  const closed = new Set<string>();

  while (open.length > 0) {
    // Pick node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    const key = cellKey(current.row, current.col);
    if (closed.has(key)) continue;
    closed.add(key);

    // Reached goal?
    if (current.row === end.row && current.col === end.col) {
      // Reconstruct path
      const path: GridCell[] = [];
      let node: Node | null = current;
      while (node) {
        path.push({ row: node.row, col: node.col });
        node = node.parent;
      }
      path.reverse();
      return path;
    }

    // Expand neighbours
    for (const [dr, dc] of DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const nk = cellKey(nr, nc);
      if (closed.has(nk) || blocked.has(nk)) continue;

      const g = current.g + 1;
      const h = heuristic({ row: nr, col: nc }, end);
      open.push({
        row: nr,
        col: nc,
        g,
        h,
        f: g + h,
        parent: current,
      });
    }
  }

  // No path found
  return [];
}
