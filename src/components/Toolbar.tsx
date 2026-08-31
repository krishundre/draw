import { useRef } from "react";
import { useStore } from "../state/store";
import { TOOLS } from "../tools/toolDefs";
import { Icon } from "./Icon";
import { createImageElement } from "../canvas/factory";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";

export function Toolbar() {
  const { appState, setTool, addElement, setSelectedIds, commitHistory, elements } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { ref: glassRef, background } = useAdaptiveContrast<HTMLDivElement>();

  function onImageClick() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = img.width * scale;
        const h = img.height * scale;
        const el = createImageElement(appState, 100, 100, elements.length, dataURL, w, h);
        addElement(el);
        setSelectedIds([el.id]);
        setTool("selection");
        commitHistory();
      };
      img.onerror = () => {
        alert("Could not insert that file — it doesn't look like a valid image.");
      };
      img.src = dataURL;
    };
    reader.onerror = () => {
      alert("Could not read that file. Please try again.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="toolbar" ref={glassRef} data-bg={background ?? undefined} data-tutorial="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.type}
          className={"tool-btn" + (appState.tool === t.type ? " active" : "")}
          title={`${t.label} (${t.key})`}
          onClick={() => (t.type === "image" ? onImageClick() : setTool(t.type))}
        >
          <Icon name={t.icon} />
        </button>
      ))}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChosen} />
    </div>
  );
}
