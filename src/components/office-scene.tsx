"use client";

import { useEffect, useRef } from "react";

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

import { OFFICE_ROOMS, deriveAgentPlacements } from "@/lib/state/office";
import type { WorkspaceSnapshot } from "@/lib/types";

interface OfficeSceneProps {
  snapshot: WorkspaceSnapshot;
}

const roomLabelStyle = new TextStyle({
  fill: "#f8f4e9",
  fontSize: 12,
  fontWeight: "700",
});

const tokenLabelStyle = new TextStyle({
  fill: "#0f172a",
  fontSize: 10,
  fontWeight: "700",
});

const infoLabelStyle = new TextStyle({
  fill: "#ffd166",
  fontSize: 13,
  fontWeight: "700",
});

function safeDestroyApplication(app: Application) {
  try {
    app.destroy();
  } catch {
    // Some Pixi internals can already be partially torn down in dev/strict mode.
    // Ensure the canvas is at least detached to prevent leaks.
    const canvas = app.canvas;
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }
}

function drawSnapshot(scene: Container, snapshot: WorkspaceSnapshot) {
  scene.removeChildren();

  for (const room of OFFICE_ROOMS) {
    const graphics = new Graphics();
    graphics.roundRect(room.x, room.y, room.width, room.height, 20);
    graphics.fill({ color: room.color, alpha: 0.32 });
    graphics.stroke({ width: 2, color: 0xf8f4e9, alpha: 0.12 });
    scene.addChild(graphics);

    const label = new Text({
      text: room.label,
      style: roomLabelStyle,
    });
    label.x = room.x + 18;
    label.y = room.y + 12;
    scene.addChild(label);
  }

  for (const placement of deriveAgentPlacements(snapshot)) {
    const token = new Container();
    token.x = placement.x;
    token.y = placement.y;

    const graphics = new Graphics();
    graphics.roundRect(0, 0, 56, 28, 10);
    graphics.fill(placement.color);
    token.addChild(graphics);

    const label = new Text({
      text: placement.label,
      style: tokenLabelStyle,
    });
    label.x = 8;
    label.y = 7;
    token.addChild(label);
    scene.addChild(token);
  }

  if (snapshot.activeMeeting) {
    const meetingLabel = new Text({
      text: `Meeting: ${snapshot.activeMeeting.title}`,
      style: infoLabelStyle,
    });
    meetingLabel.x = 296;
    meetingLabel.y = 358;
    scene.addChild(meetingLabel);
  }
}

export function OfficeScene({ snapshot }: OfficeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Container | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let disposed = false;
    let initialized = false;
    const app = new Application();

    async function mount() {
      try {
        await app.init({
          width: 704,
          height: 470,
          background: 0x0f1117,
          antialias: true,
        });
        initialized = true;

        if (disposed) {
          safeDestroyApplication(app);
          return;
        }

        const host = hostRef.current;
        if (!host) {
          safeDestroyApplication(app);
          return;
        }

        host.innerHTML = "";
        host.appendChild(app.canvas);

        const scene = new Container();
        sceneRef.current = scene;
        app.stage.addChild(scene);
        drawSnapshot(scene, snapshotRef.current);
      } catch {
        safeDestroyApplication(app);
      }
    }

    void mount();

    return () => {
      disposed = true;
      sceneRef.current = null;
      if (initialized) {
        safeDestroyApplication(app);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    drawSnapshot(sceneRef.current, snapshot);
  }, [snapshot]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101218] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div ref={hostRef} className="h-[470px] w-full" />
    </div>
  );
}
