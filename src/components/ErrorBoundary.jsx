import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import { PAPER_BG, cardStyle } from "../lib/constants";
import { primaryBtn, ghostBtn } from "../lib/styles";

// Catches any render/lifecycle error anywhere below it and shows a recoverable screen
// instead of an unmounted, blank white app. Class component because React only supports
// error boundaries via getDerivedStateFromError / componentDidCatch (no hook equivalent).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Scaffold crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: PAPER_BG, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ ...cardStyle, width: 420, maxWidth: "100%", padding: 28, textAlign: "center" }}>
          <div style={{ marginBottom: 8 }}><TriangleAlert size={26} strokeWidth={2} color="#8B95A1" /></div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#000000", marginBottom: 6 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#8B95A1", marginBottom: 18, lineHeight: 1.5 }}>
            Scaffold hit an unexpected error. Your data is safe, and reloading the page usually fixes this.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ ...primaryBtn, width: "100%" }}
          >
            Reload
          </button>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-ghost"
            style={{ ...ghostBtn, width: "100%", marginTop: 8, border: "none", background: "none" }}
          >
            Try to continue without reloading
          </button>
        </div>
      </div>
    );
  }
}
