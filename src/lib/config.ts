import fs from "node:fs";
import path from "node:path";

const DATA_DIR =
  process.env.TEAM_FOUNDRY_DATA_DIR ?? path.join(process.cwd(), ".data");

export const appPaths = {
  dataDir: DATA_DIR,
  dbFile: path.join(DATA_DIR, "team-foundry.db"),
  uploadsDir: path.join(DATA_DIR, "uploads"),
};

export function ensureAppDirectories() {
  fs.mkdirSync(appPaths.dataDir, { recursive: true });
  fs.mkdirSync(appPaths.uploadsDir, { recursive: true });
}

export function ensureWorkspaceUploadDirectory(workspaceId: string) {
  const dir = path.join(appPaths.uploadsDir, workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
