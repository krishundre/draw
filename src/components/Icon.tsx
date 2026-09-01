export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {shapeFor(name)}
    </svg>
  );
}

function shapeFor(name: string) {
  switch (name) {
    case "cursor":
      return <path d="M4 3 L17 10 L11 11.5 L14.5 17 L11.5 18.5 L8 12.5 L4 16 Z" />;
    case "hand":
      return <path d="M5 11V6a1.3 1.3 0 0 1 2.6 0v4M7.6 10V4.5a1.3 1.3 0 0 1 2.6 0V10M10.2 10V5.3a1.3 1.3 0 0 1 2.6 0v6.2M12.8 11.5v-1a1.3 1.3 0 0 1 2.6 0V13a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 3.4 14l-1-3a1.2 1.2 0 0 1 2.2-1z" />;
    case "rect":
      return <rect x="3.5" y="4.5" width="13" height="11" rx="1" />;
    case "diamond":
      return <path d="M10 3 L17 10 L10 17 L3 10 Z" />;
    case "ellipse":
      return <ellipse cx="10" cy="10" rx="7" ry="6" />;
    case "arrow":
      return <path d="M3 17 L17 3 M17 3 L10 3 M17 3 L17 10" />;
    case "line":
      return <path d="M3 17 L17 3" />;
    case "draw":
      return <path d="M4 15 Q4 6 9 8 T14 6 Q18 5 16 10" />;
    case "text":
      return <path d="M4 4 H16 M10 4 V16" />;
    case "image":
      return (
        <>
          <rect x="3" y="4" width="14" height="12" rx="1" />
          <circle cx="7.5" cy="8.5" r="1.3" />
          <path d="M4 15 L8.5 10.5 L11.5 13.5 L13.5 11.5 L17 15" />
        </>
      );
    case "eraser":
      return <path d="M4 13 L11 6 a2 2 0 0 1 3 0 l2 2 a2 2 0 0 1 0 3 L13 18 H8 L4 14 a1 1 0 0 1 0 -1Z M8 18 H16" />;
    case "frame":
      return (
        <>
          <path d="M6 2 V16 M4 6 H18" />
        </>
      );
    case "lock":
      return (
        <>
          <rect x="5" y="9" width="10" height="8" rx="1" />
          <path d="M7 9V6a3 3 0 0 1 6 0v3" />
        </>
      );
    case "undo":
      return <path d="M6 6 L3 9 L6 12 M3 9 H12 a5 5 0 0 1 0 10 H8" />;
    case "redo":
      return <path d="M14 6 L17 9 L14 12 M17 9 H8 a5 5 0 0 0 0 10 H12" />;
    case "trash":
      return <path d="M4 6 H16 M8 6 V4 H12 V6 M6 6 L7 17 H13 L14 6" />;
    case "duplicate":
      return (
        <>
          <rect x="3" y="3" width="11" height="11" rx="1" />
          <rect x="6" y="6" width="11" height="11" rx="1" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="10" cy="10" r="4" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.5 1.5M14 14l1.5 1.5M4.5 15.5L6 14M14 6l1.5-1.5" />
        </>
      );
    case "moon":
      return <path d="M16 12.5A7 7 0 1 1 7.5 4a5.5 5.5 0 0 0 8.5 8.5Z" />;
    case "menu":
      return <path d="M3 5h14M3 10h14M3 15h14" />;
    case "lasso":
      return (
        <>
          <path d="M10 3 C4 3 3 7 5 9.5 C6.5 11.3 9 10.5 9 12.5 C9 14.5 6.5 14 6 16" />
          <circle cx="5.4" cy="16.3" r="1.1" fill="currentColor" stroke="none" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M16.5 16.5 L12.7 12.7" />
        </>
      );
    case "crop":
      return <path d="M6 2 V14 H18 M2 6 H14 V18" />;
    case "embed":
      return (
        <>
          <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
          <path d="M7 8.5 L4.5 10.5 L7 12.5 M13 8.5 L15.5 10.5 L13 12.5" />
        </>
      );
    default:
      return <circle cx="10" cy="10" r="6" />;
  }
}
