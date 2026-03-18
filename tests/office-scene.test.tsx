import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeScene } from "@/components/office-scene";
import type { WorkspaceSnapshot } from "@/lib/types";

const pixiMockState = vi.hoisted(() => ({
  deferInit: false,
  destroyCalls: 0,
  destroyThrows: false,
  resolveInit: null as (() => void) | null,
}));

vi.mock("pixi.js", () => {
  class Container {
    children: unknown[] = [];
    x = 0;
    y = 0;

    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }

    removeChildren() {
      this.children = [];
    }
  }

  class Graphics extends Container {
    roundRect() {
      return this;
    }

    fill() {
      return this;
    }

    stroke() {
      return this;
    }
  }

  class TextStyle {
    constructor(input: unknown) {
      Object.assign(this, input);
    }
  }

  class Text extends Container {
    text = "";
    style: unknown;

    constructor(input: { text?: string; style?: unknown }) {
      super();
      this.text = input.text ?? "";
      this.style = input.style;
    }
  }

  class Application {
    canvas = document.createElement("canvas");
    stage = new Container();

    async init() {
      if (!pixiMockState.deferInit) {
        return;
      }

      await new Promise<void>((resolve) => {
        pixiMockState.resolveInit = resolve;
      });
    }

    destroy() {
      pixiMockState.destroyCalls += 1;
      if (pixiMockState.destroyThrows) {
        throw new TypeError("this._cancelResize is not a function");
      }
    }
  }

  return { Application, Container, Graphics, Text, TextStyle };
});

function buildSnapshot(): WorkspaceSnapshot {
  return {
    workspace: {
      id: "workspace-1",
      title: "Workspace",
      providerId: "mock",
      status: "running",
      createdAt: 1,
      updatedAt: 1,
    },
    assumptions: [],
    expectedOutputs: [],
    tasks: [],
    artifacts: [],
    approvals: [],
    events: [],
    agents: [
      {
        agentId: "agent-1",
        roleId: "research-lead",
        title: "Research Lead",
        displayName: "Morgan",
        responsibilities: [],
        rationale: "",
        systemPrompt: "",
        state: "researching",
      },
    ],
    runStatus: "running",
  };
}

describe("OfficeScene cleanup", () => {
  beforeEach(() => {
    pixiMockState.deferInit = false;
    pixiMockState.destroyCalls = 0;
    pixiMockState.destroyThrows = false;
    pixiMockState.resolveInit = null;
  });

  afterEach(() => {
    pixiMockState.resolveInit?.();
    pixiMockState.resolveInit = null;
    cleanup();
  });

  it("handles pixi destroy failures during unmount without crashing", async () => {
    pixiMockState.destroyThrows = true;
    const { container, unmount } = render(<OfficeScene snapshot={buildSnapshot()} />);

    await waitFor(() => {
      expect(container.querySelector("canvas")).not.toBeNull();
    });

    expect(() => {
      unmount();
    }).not.toThrow();
    expect(pixiMockState.destroyCalls).toBe(1);
  });

  it("does not destroy immediately when unmounted before app init resolves", async () => {
    pixiMockState.deferInit = true;
    const { unmount } = render(<OfficeScene snapshot={buildSnapshot()} />);

    expect(() => {
      unmount();
    }).not.toThrow();
    expect(pixiMockState.destroyCalls).toBe(0);

    pixiMockState.resolveInit?.();
    await waitFor(() => {
      expect(pixiMockState.destroyCalls).toBe(1);
    });
  });
});
