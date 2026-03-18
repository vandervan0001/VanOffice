import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspacesTable = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  providerId: text("provider_id").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const runEventsTable = sqliteTable("run_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sequence: integer("sequence").notNull(),
  type: text("type").notNull(),
  createdAt: integer("created_at").notNull(),
  payloadJson: text("payload_json").notNull(),
});
