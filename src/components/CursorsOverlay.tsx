import { useEffect, useState } from "react";
import { getProvider } from "../collab/doc";

interface RemoteState {
  user?: { name: string; color: string };
  cursor?: { x: number; y: number };
}

export function CursorsOverlay({ scrollX, scrollY, zoom }: { scrollX: number; scrollY: number; zoom: number }) {
  const [states, setStates] = useState<RemoteState[]>([]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    const update = () => {
      const values = Array.from(provider.awareness.getStates().values()) as RemoteState[];
      setStates(values.filter((v) => v.cursor));
    };
    provider.awareness.on("change", update);
    update();
    return () => provider.awareness.off("change", update);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {states.map((s, i) => {
        if (!s.cursor) return null;
        const x = s.cursor.x * zoom + scrollX;
        const y = s.cursor.y * zoom + scrollY;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-2px,-2px)" }}>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M2 2 L2 16 L6 12.5 L9 18 L11.5 16.5 L8.5 11 L14 11 Z" fill={s.user?.color ?? "#ff6b6b"} stroke="white" strokeWidth="1" />
            </svg>
            <span
              style={{
                position: "absolute",
                left: 16,
                top: 14,
                background: s.user?.color ?? "#ff6b6b",
                color: "white",
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              {s.user?.name ?? "Guest"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
