import Database from "better-sqlite3";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { nanoid } from "nanoid";

import { appPaths, ensureAppDirectories } from "@/lib/config";
import { runEventsTable, workspacesTable } from "@/lib/db/schema";
import type {
  RunEvent,
  RunEventPayloadMap,
  RunEventType,
  WorkspaceRecord,
  WorkspaceStatus,
} from "@/lib/types";

let sqliteInstance: Database | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  ensureAppDirectories();

  const sqlite = new Database(appPaths.dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS run_events_workspace_sequence_idx
    ON run_events (workspace_id, sequence);
  `);

  sqliteInstance = sqlite;
  dbInstance = drizzle(sqliteInstance, {
    schema: {
      workspacesTable,
      runEventsTable,
    },
  });

  return dbInstance;
}

export async function createWorkspaceRecord(input: {
  title: string;
  providerId: string;
  status: WorkspaceStatus;
}): Promise<WorkspaceRecord> {
  const db = getDb();
  const now = Date.now();
  const record: WorkspaceRecord = {
    id: nanoid(),
    title: input.title,
    providerId: input.providerId,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(workspacesTable)
    .values({
      id: record.id,
      title: record.title,
      providerId: record.providerId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
    .run();

  return record;
}

export async function setWorkspaceStatus(
  workspaceId: string,
  status: WorkspaceStatus,
) {
  const db = getDb();
  db.update(workspacesTable)
    .set({
      status,
      updatedAt: Date.now(),
    })
    .where(eq(workspacesTable.id, workspaceId))
    .run();
}

export async function getWorkspaceRecord(
  workspaceId: string,
): Promise<WorkspaceRecord | undefined> {
  const db = getDb();
  const row = db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .get();

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    title: row.title,
    providerId: row.providerId,
    status: row.status as WorkspaceStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listWorkspaceEvents(
  workspaceId: string,
): Promise<RunEvent[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(runEventsTable)
    .where(eq(runEventsTable.workspaceId, workspaceId))
    .orderBy(asc(runEventsTable.sequence))
    .all();

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    sequence: row.sequence,
    type: row.type as RunEventType,
    createdAt: row.createdAt,
    payload: JSON.parse(row.payloadJson) as RunEventPayloadMap[RunEventType],
  }));
}

export async function appendEvent<T extends RunEventType>(
  workspaceId: string,
  type: T,
  payload: RunEventPayloadMap[T],
): Promise<RunEvent<T>> {
  const db = getDb();
  const currentMax =
    db
      .select({
        value: sql<number>`coalesce(max(${runEventsTable.sequence}), 0)`,
      })
      .from(runEventsTable)
      .where(eq(runEventsTable.workspaceId, workspaceId))
      .get()?.value ?? 0;

  const event: RunEvent<T> = {
    id: nanoid(),
    workspaceId,
    sequence: currentMax + 1,
    type,
    createdAt: Date.now(),
    payload,
  };

  db.insert(runEventsTable)
    .values({
      id: event.id,
      workspaceId: event.workspaceId,
      sequence: event.sequence,
      type: event.type,
      createdAt: event.createdAt,
      payloadJson: JSON.stringify(event.payload),
    })
    .run();

  db.update(workspacesTable)
    .set({ updatedAt: Date.now() })
    .where(eq(workspacesTable.id, workspaceId))
    .run();

  return event;
}

export async function findWorkspaceEvent<T extends RunEventType>(
  workspaceId: string,
  type: T,
) {
  const db = getDb();
  const row = db
    .select()
    .from(runEventsTable)
    .where(
      and(eq(runEventsTable.workspaceId, workspaceId), eq(runEventsTable.type, type)),
    )
    .orderBy(desc(runEventsTable.sequence))
    .limit(1)
    .get();

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    sequence: row.sequence,
    type: row.type as T,
    createdAt: row.createdAt,
    payload: JSON.parse(row.payloadJson) as RunEventPayloadMap[T],
  };
}
