import fs from "node:fs/promises";
import path from "node:path";

import { appPaths } from "@/lib/config";
import type { ResearchResult, ToolAdapter, UploadedFileRecord } from "@/lib/types";

async function safeReadUtf8(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export const localToolAdapter: ToolAdapter = {
  id: "local-tools",
  label: "Local Files + DuckDuckGo",
  readBriefFiles: async (files: UploadedFileRecord[]) => {
    const contents = await Promise.all(
      files.map((file) =>
        safeReadUtf8(path.join(appPaths.uploadsDir, file.relativePath)),
      ),
    );

    return contents.filter(Boolean);
  },
  searchWeb: async (query: string): Promise<ResearchResult> => {
    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      );
      const data = (await response.json()) as {
        AbstractText?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };

      const citations =
        data.RelatedTopics?.slice(0, 4)
          .map((topic) => topic.FirstURL)
          .filter((value): value is string => Boolean(value)) ?? [];

      return {
        query,
        summary:
          data.AbstractText ||
          data.RelatedTopics?.slice(0, 3)
            .map((topic) => topic.Text)
            .filter(Boolean)
            .join(" ") ||
          "No external web summary available. Proceed with cautious assumptions.",
        citations,
      };
    } catch {
      return {
        query,
        summary:
          "Live web search was unavailable. The runtime should continue with local brief context and flag reduced confidence.",
        citations: [],
      };
    }
  },
};
