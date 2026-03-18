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

export function OfficeScene({ snapshot }: OfficeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const app = new Application();

    async function mount() {
      await app.init({
        width: 704,
        height: 470,
        background: 0x0f1117,
        antialias: true,
      });

      if (!mounted) {
        app.destroy(true);
        return;
      }

      const currentHost = hostRef.current;
      if (!currentHost) {
        app.destroy(true);
        return;
      }

      currentHost.innerHTML = "";
      currentHost.appendChild(app.canvas);

      const labelStyle = new TextStyle({
        fill: "#f8f4e9",
        fontSize: 12,
        fontWeight: "700",
      });

      const tokenStyle = new TextStyle({
        fill: "#0f172a",
        fontSize: 10,
        fontWeight: "700",
      });

      const infoStyle = new TextStyle({
        fill: "#ffd166",
        fontSize: 13,
        fontWeight: "700",
      });

      for (const room of OFFICE_ROOMS) {
        const graphics = new Graphics();
        graphics.roundRect(room.x, room.y, room.width, room.height, 20);
        graphics.fill({ color: room.color, alpha: 0.32 });
        graphics.stroke({ width: 2, color: 0xf8f4e9, alpha: 0.12 });
        app.stage.addChild(graphics);

        const label = new Text({
          text: room.label,
          style: labelStyle,
        });
        label.x = room.x + 18;
        label.y = room.y + 12;
        app.stage.addChild(label);
      }

      for (const placement of deriveAgentPlacements(snapshot)) {
        const token = new Container({
          x: placement.x,
          y: placement.y,
        });
        const graphics = new Graphics();
        graphics.roundRect(0, 0, 56, 28, 10);
        graphics.fill(placement.color);
        token.addChild(graphics);

        const label = new Text({
          text: placement.label,
          style: tokenStyle,
        });
        label.x = 8;
        label.y = 7;
        token.addChild(label);
        app.stage.addChild(token);
      }

      if (snapshot.activeMeeting) {
        const meetingLabel = new Text({
          text: `Meeting: ${snapshot.activeMeeting.title}`,
          style: infoStyle,
        });
        meetingLabel.x = 296;
        meetingLabel.y = 358;
        app.stage.addChild(meetingLabel);
      }
    }

    void mount();

    return () => {
      mounted = false;
      app.destroy(true);
    };
  }, [snapshot]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101218] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div ref={hostRef} className="h-[470px] w-full" />
    </div>
  );
}
