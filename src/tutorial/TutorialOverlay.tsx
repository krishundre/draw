import { useEffect, useMemo, useRef, useState } from "react";
import { TUTORIAL_STEPS } from "./steps";
import { useStore } from "../state/store";
import { markTutorialSeen } from "../collab/doc";

const PADDING = 8;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function TutorialOverlay() {
  const store = useStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const step = TUTORIAL_STEPS[stepIndex];
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
  const wasEmptyOnOpen = useRef(store.elements.length === 0);

  function finish() {
    markTutorialSeen();
    // If we forced the rectangle tool for the style-panel step and the user
    // never actually drew anything, put the tool back the way we found it.
    if (store.appState.tool !== "selection" && wasEmptyOnOpen.current && store.elements.length === 0) {
      store.setTool("selection");
    }
    store.setAppState({ tutorialOpen: false });
  }

  function next() {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  // Drive real UI state so the style panel actually exists to spotlight —
  // only when the canvas is empty (a fresh first-visit), so this never
  // disturbs an in-progress drawing.
  useEffect(() => {
    if (step.id === "style-panel" && wasEmptyOnOpen.current && store.elements.length === 0) {
      store.setTool("rectangle");
    }
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Locate the target element and track its position (layout can shift
  // between steps — e.g. the style panel appearing changes nothing else's
  // position here, but window resize should still keep things aligned).
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    function measure() {
      const el = document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    }
    // wait a couple of frames for any tool-forced re-render (style panel
    // appearing) to actually commit before measuring its position
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", measure);
    };
  }, [step.target, stepIndex]);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        back();
      } else if (e.key === "Tab") {
        // keep focus within the tooltip card — it's the only interactive
        // surface while the tutorial is up
        const focusables = tooltipRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const tooltipStyle = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!targetRect) {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }
    const cardWidth = 300;
    const spaceBelow = vh - targetRect.bottom;
    const placeBelow = spaceBelow > 160 || targetRect.top < 160;
    const top = placeBelow ? targetRect.bottom + 14 : Math.max(12, targetRect.top - 14);
    let left = targetRect.left;
    left = Math.min(left, vw - cardWidth - 12);
    left = Math.max(12, left);
    return placeBelow
      ? { left, top, transform: "none" }
      : { left, top, transform: "translateY(-100%)" };
  }, [targetRect]);

  return (
    <div className="tutorial-root" role="dialog" aria-modal="true" aria-label="DrawBoard tutorial">
      {targetRect ? (
        // The spotlight's own huge box-shadow dims everything OUTSIDE this
        // rect, leaving the rect itself — the highlighted target — fully
        // undimmed. That's the actual spotlight cutout; there's no separate
        // full-screen scrim layered on top of it (that would just darken the
        // "hole" right back).
        <div
          className={"tutorial-spotlight" + (reducedMotion ? " no-motion" : "")}
          style={{
            left: targetRect.left - PADDING,
            top: targetRect.top - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className="tutorial-scrim" onClick={finish} />
      )}
      <div
        className={"tutorial-tooltip glass" + (reducedMotion ? " no-motion" : "")}
        style={tooltipStyle}
        ref={tooltipRef}
        tabIndex={-1}
      >
        <div className="tutorial-step-count">
          Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
        </div>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={finish}>
            Skip
          </button>
          <div className="tutorial-nav">
            {stepIndex > 0 && (
              <button className="tutorial-back" onClick={back}>
                Back
              </button>
            )}
            <button className="tutorial-next" onClick={next} ref={nextButtonRef}>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
