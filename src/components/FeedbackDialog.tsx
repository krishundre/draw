import { useState } from "react";

type FeedbackType = "bug" | "feature" | "general";
type SubmitState = "idle" | "sending" | "success" | "error";

export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — left blank by humans
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, message, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("success");
      setName("");
      setEmail("");
      setType("general");
      setMessage("");
    } catch {
      setErrorMsg("Couldn't reach the server. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>Send feedback</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {state === "success" ? (
          <div className="feedback-success">
            <p>Thanks — your feedback was sent!</p>
            <button className="tool-btn primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <label>
              Name <span className="optional">(optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={200} />
            </label>
            <label>
              Email <span className="optional">(optional, so we can reply)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={200} />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
                <option value="general">General feedback</option>
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
              </select>
            </label>
            <label>
              Message
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                maxLength={5000}
              />
            </label>
            {/* Honeypot field — hidden from real users via CSS, not display:none (some bots skip those) */}
            <label className="honeypot" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>

            {state === "error" && <div className="feedback-error">{errorMsg}</div>}

            <button type="submit" className="tool-btn primary" disabled={state === "sending" || !message.trim()}>
              {state === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
