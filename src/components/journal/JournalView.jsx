import { useState } from "react";
import { BookOpen } from "lucide-react";
import { JOURNAL_PROMPTS, cardStyle, serifFont } from "../../lib/constants";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, FilterPill, SectionHeader, SubHeader } from "../shared/Misc";

export default function JournalView({ entries, onAddEntry, onRemoveEntry }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [category, setCategory] = useState("Gratitude");
  const [prompt, setPrompt] = useState(() => JOURNAL_PROMPTS.Gratitude[0]);
  const [mode, setMode] = useState("prompt"); // 'prompt' | 'freewrite'
  const [text, setText] = useState("");

  const shuffle = (cat) => {
    const pool = JOURNAL_PROMPTS[cat || category];
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && next === prompt) next = pool[(pool.indexOf(next) + 1) % pool.length];
    setPrompt(next);
    setMode("prompt");
  };

  const save = () => {
    if (!text.trim()) return;
    onAddEntry(mode === "prompt" ? prompt : null, text.trim());
    setText("");
  };

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <SectionHeader title="Journal" Icon={BookOpen} tint={CATEGORY_COLORS.Personal} />

      <div style={{ ...cardStyle, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {Object.keys(JOURNAL_PROMPTS).map((c) => (
            <FilterPill key={c} label={c} active={category === c} onClick={() => { setCategory(c); shuffle(c); }} />
          ))}
        </div>

        {mode === "prompt" ? (
          <div style={{ fontFamily: serifFont, fontSize: 19, fontStyle: "italic", color: "#000000", marginBottom: 10, lineHeight: 1.4 }}>{prompt}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: "#93A0AD", marginBottom: 10 }}>Free write, no prompt today.</div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing..."
          rows={5}
          style={{ ...inputStyle, width: "100%", resize: "vertical", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit" }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => shuffle()} className="btn-ghost" style={ghostBtn}>Shuffle prompt</button>
          <button onClick={() => { setMode("freewrite"); setText(text); }} className="btn-ghost" style={ghostBtn}>Skip, free write</button>
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!text.trim()} style={{ ...primaryBtn, opacity: text.trim() ? 1 : 0.5 }}>Save entry</button>
        </div>
      </div>

      <SubHeader>Entries</SubHeader>
      {sorted.length === 0 ? (
        <EmptyState text="No entries yet. Your first one is right above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((e) => (
            <div key={e.id} className="hoverable" style={{ ...cardStyle, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 11.5, color: "#8B95A1", fontWeight: 600 }}>{e.date}</div>
                <button onClick={() => onRemoveEntry(e.id)} className="btn-delete" style={deleteBtn}>×</button>
              </div>
              {e.prompt && <div style={{ fontFamily: serifFont, fontSize: 14.5, fontStyle: "italic", color: "#6E93B7", marginBottom: 4 }}>{e.prompt}</div>}
              <div style={{ fontSize: 14, color: "#000000", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{e.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
