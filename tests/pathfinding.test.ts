import { describe, expect, it } from "vitest";
import { findPath, type GridCell } from "@/lib/state/pathfinding";

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

describe("findPath (A*)", () => {
  it("finds a straight-line path with no obstacles", () => {
    const blocked = new Set<string>();
    const path = findPath(10, 10, blocked, { row: 0, col: 0 }, { row: 0, col: 4 });

    expect(path.length).toBe(5);
    expect(path[0]).toEqual({ row: 0, col: 0 });
    expect(path[4]).toEqual({ row: 0, col: 4 });

    // Every step should be exactly 1 cell apart (4-directional)
    for (let i = 1; i < path.length; i++) {
      const dr = Math.abs(path[i].row - path[i - 1].row);
      const dc = Math.abs(path[i].col - path[i - 1].col);
      expect(dr + dc).toBe(1);
    }
  });

  it("finds a path around an obstacle", () => {
    // 5x5 grid with a wall blocking the direct horizontal path
    //  S . . . .
    //  # # # . .
    //  . . . . .
    //  . . . . E
    const blocked = new Set<string>();
    blocked.add(cellKey(1, 0));
    blocked.add(cellKey(1, 1));
    blocked.add(cellKey(1, 2));

    const path = findPath(5, 5, blocked, { row: 0, col: 0 }, { row: 3, col: 4 });

    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ row: 0, col: 0 });
    expect(path[path.length - 1]).toEqual({ row: 3, col: 4 });

    // No step should land on a blocked cell
    for (const step of path) {
      expect(blocked.has(cellKey(step.row, step.col))).toBe(false);
    }

    // All steps are 4-directional
    for (let i = 1; i < path.length; i++) {
      const dr = Math.abs(path[i].row - path[i - 1].row);
      const dc = Math.abs(path[i].col - path[i - 1].col);
      expect(dr + dc).toBe(1);
    }
  });

  it("returns empty array when destination is blocked", () => {
    const blocked = new Set<string>();
    blocked.add(cellKey(2, 2));

    const path = findPath(5, 5, blocked, { row: 0, col: 0 }, { row: 2, col: 2 });
    expect(path).toEqual([]);
  });

  it("returns empty array when no path exists (fully enclosed)", () => {
    // Surround the start with walls
    const blocked = new Set<string>();
    blocked.add(cellKey(0, 1));
    blocked.add(cellKey(1, 0));
    blocked.add(cellKey(1, 1));

    const path = findPath(5, 5, blocked, { row: 0, col: 0 }, { row: 4, col: 4 });
    expect(path).toEqual([]);
  });

  it("returns single-element path when start equals end", () => {
    const blocked = new Set<string>();
    const path = findPath(5, 5, blocked, { row: 2, col: 3 }, { row: 2, col: 3 });

    expect(path).toEqual([{ row: 2, col: 3 }]);
  });

  it("returns empty array when destination is out of bounds", () => {
    const blocked = new Set<string>();
    const path = findPath(5, 5, blocked, { row: 0, col: 0 }, { row: 5, col: 0 });
    expect(path).toEqual([]);
  });

  it("finds the shortest path (Manhattan distance optimal)", () => {
    const blocked = new Set<string>();
    const path = findPath(10, 10, blocked, { row: 1, col: 1 }, { row: 4, col: 6 });

    // Optimal path length = Manhattan distance + 1 (inclusive)
    // Manhattan = |4-1| + |6-1| = 3 + 5 = 8, so path has 9 cells
    expect(path.length).toBe(9);
  });
});
