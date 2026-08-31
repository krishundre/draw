import { useStore } from "../state/store";
import type { ArrowheadStyle, EdgeStyle, ElementStyle, FillStyle, FontFamily, Roughness, StrokeStyle, StrokeWidth, TextAlign, ArrowElement, TextElement } from "../types";
import { Icon } from "./Icon";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";

const STROKE_PRESETS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
const BG_PRESETS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-section">
      <div className="panel-label">{title}</div>
      {children}
    </div>
  );
}

function Swatches({ value, onChange, presets }: { value: string; onChange: (v: string) => void; presets: string[] }) {
  return (
    <div className="swatch-row">
      {presets.map((c) => (
        <button
          key={c}
          className={"swatch" + (value === c ? " active" : "")}
          style={{ background: c === "transparent" ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px" : c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
      <input type="color" value={value === "transparent" ? "#ffffff" : value} onChange={(e) => onChange(e.target.value)} className="color-input" />
    </div>
  );
}

function SegButtons<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="seg-group">
      {options.map((o) => (
        <button key={o.value} className={"seg-btn" + (value === o.value ? " active" : "")} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StylePanel() {
  const store = useStore();
  const { appState, elements, setStyle, updateElements, setAppState, bringToFront, bringForward, sendBackward, sendToBack, group, ungroup, deleteElements } = store;

  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));
  const hasSelection = selected.length > 0;
  const style: ElementStyle = hasSelection ? selected[0] : appState.currentStyle;

  const showPanel = appState.tool !== "selection" || hasSelection;
  const { ref: glassRef, background } = useAdaptiveContrast<HTMLDivElement>(showPanel);
  if (!showPanel) return null;

  function applyStyle(partial: Partial<ElementStyle>) {
    if (hasSelection) {
      updateElements(store.appState.selectedIds, partial);
      store.commitHistory();
    } else {
      setStyle(partial);
    }
  }

  const isTextTool = appState.tool === "text" || selected.some((e) => e.type === "text");
  const isArrowTool = appState.tool === "arrow" || selected.some((e) => e.type === "arrow");
  const textEl = selected.find((e) => e.type === "text") as TextElement | undefined;
  const arrowEl = selected.find((e) => e.type === "arrow") as ArrowElement | undefined;

  return (
    <div className="style-panel" ref={glassRef} data-bg={background ?? undefined} data-tutorial="style-panel">
      <Section title="Stroke">
        <Swatches value={style.strokeColor} onChange={(v) => applyStyle({ strokeColor: v })} presets={STROKE_PRESETS} />
      </Section>
      <Section title="Background">
        <Swatches value={style.backgroundColor} onChange={(v) => applyStyle({ backgroundColor: v })} presets={BG_PRESETS} />
      </Section>
      {style.backgroundColor !== "transparent" && (
        <Section title="Fill style">
          <SegButtons<FillStyle>
            value={style.fillStyle}
            onChange={(v) => applyStyle({ fillStyle: v })}
            options={[
              { value: "hachure", label: "Hachure" },
              { value: "cross-hatch", label: "Cross" },
              { value: "solid", label: "Solid" },
            ]}
          />
        </Section>
      )}
      <Section title="Stroke width">
        <SegButtons<StrokeWidth>
          value={style.strokeWidth}
          onChange={(v) => applyStyle({ strokeWidth: v })}
          options={[
            { value: "thin", label: "S" },
            { value: "bold", label: "M" },
            { value: "extra-bold", label: "L" },
          ]}
        />
      </Section>
      <Section title="Stroke style">
        <SegButtons<StrokeStyle>
          value={style.strokeStyle}
          onChange={(v) => applyStyle({ strokeStyle: v })}
          options={[
            { value: "solid", label: "—" },
            { value: "dashed", label: "- -" },
            { value: "dotted", label: "···" },
          ]}
        />
      </Section>
      <Section title="Sloppiness">
        <SegButtons<Roughness>
          value={style.roughness}
          onChange={(v) => applyStyle({ roughness: v })}
          options={[
            { value: "architect", label: "Architect" },
            { value: "artist", label: "Artist" },
            { value: "cartoonist", label: "Cartoonist" },
          ]}
        />
      </Section>
      <Section title="Edges">
        <SegButtons<EdgeStyle>
          value={style.edges}
          onChange={(v) => applyStyle({ edges: v })}
          options={[
            { value: "sharp", label: "Sharp" },
            { value: "round", label: "Round" },
          ]}
        />
      </Section>

      {isArrowTool && (
        <Section title="Arrowheads">
          <div className="seg-group">
            <select
              value={arrowEl?.startArrowhead ?? appState.currentStartArrowhead}
              onChange={(e) => {
                const v = e.target.value as ArrowheadStyle;
                if (arrowEl) updateElements([arrowEl.id], { startArrowhead: v } as never);
                setAppState({ currentStartArrowhead: v });
              }}
            >
              {["none", "arrow", "triangle", "dot", "bar"].map((v) => (
                <option key={v} value={v}>
                  start: {v}
                </option>
              ))}
            </select>
            <select
              value={arrowEl?.endArrowhead ?? appState.currentEndArrowhead}
              onChange={(e) => {
                const v = e.target.value as ArrowheadStyle;
                if (arrowEl) updateElements([arrowEl.id], { endArrowhead: v } as never);
                setAppState({ currentEndArrowhead: v });
              }}
            >
              {["none", "arrow", "triangle", "dot", "bar"].map((v) => (
                <option key={v} value={v}>
                  end: {v}
                </option>
              ))}
            </select>
          </div>
        </Section>
      )}

      {isTextTool && (
        <Section title="Font">
          <SegButtons<FontFamily>
            value={textEl?.fontFamily ?? appState.currentFontFamily}
            onChange={(v) => {
              if (textEl) updateElements([textEl.id], { fontFamily: v } as never);
              setAppState({ currentFontFamily: v });
            }}
            options={[
              { value: "hand-drawn", label: "Hand" },
              { value: "normal", label: "Normal" },
              { value: "code", label: "Code" },
            ]}
          />
          <input
            type="range"
            min={12}
            max={72}
            value={textEl?.fontSize ?? appState.currentFontSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (textEl) updateElements([textEl.id], { fontSize: v } as never);
              setAppState({ currentFontSize: v });
            }}
          />
          <SegButtons<TextAlign>
            value={textEl?.textAlign ?? appState.currentTextAlign}
            onChange={(v) => {
              if (textEl) updateElements([textEl.id], { textAlign: v } as never);
              setAppState({ currentTextAlign: v });
            }}
            options={[
              { value: "left", label: "L" },
              { value: "center", label: "C" },
              { value: "right", label: "R" },
            ]}
          />
        </Section>
      )}

      <Section title="Opacity">
        <input type="range" min={0} max={100} value={style.opacity} onChange={(e) => applyStyle({ opacity: Number(e.target.value) })} />
      </Section>

      {hasSelection && (
        <>
          <Section title="Layers">
            <div className="icon-row">
              <button title="Send to back" onClick={() => sendToBack(appState.selectedIds)}>
                <Icon name="frame" />
                Back
              </button>
              <button title="Send backward" onClick={() => sendBackward(appState.selectedIds)}>
                ↓
              </button>
              <button title="Bring forward" onClick={() => bringForward(appState.selectedIds)}>
                ↑
              </button>
              <button title="Bring to front" onClick={() => bringToFront(appState.selectedIds)}>
                Front
              </button>
            </div>
          </Section>
          <Section title="Actions">
            <div className="icon-row">
              {selected.length > 1 && <button onClick={() => group(appState.selectedIds)}>Group</button>}
              {selected.some((e) => e.groupIds.length) && <button onClick={() => ungroup(appState.selectedIds)}>Ungroup</button>}
              <button
                onClick={() => {
                  updateElements(appState.selectedIds, { locked: !selected[0].locked } as never);
                  store.commitHistory();
                }}
              >
                {selected[0].locked ? "Unlock" : "Lock"}
              </button>
              <button onClick={() => deleteElements(appState.selectedIds)}>
                <Icon name="trash" />
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
