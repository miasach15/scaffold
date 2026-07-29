import { useState } from "react";
import { StickyNote, Pin } from "lucide-react";
import { LIFESTYLE_COLORS, NOTE_CARD_COLORS, cardStyle } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, SectionHeader } from "../shared/Misc";
import { useNotes } from "../../hooks/useNotes";

export default function NotesView({ userId }) {
  const { notes, addNote, setPinned, removeNote } = useNotes(userId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState("yellow");
  const col = LIFESTYLE_COLORS.notes;

  const save = () => {
    if (!body.trim()) return;
    addNote(title, body, color);
    setTitle(""); setBody(""); setColor("yellow");
  };

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  return (
    <div>
      <SectionHeader title="Notes" subtitle="Quick thoughts, anywhere." Icon={StickyNote} tint={col} />

      <div style={{ ...cardStyle, padding: 14, marginBottom: 20, background: NOTE_CARD_COLORS[color].bg, borderColor: NOTE_CARD_COLORS[color].border }}>
        <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, width: "100%", background: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }} />
        <textarea placeholder="Write something..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={{ ...inputStyle, width: "100%", background: "rgba(255,255,255,0.6)", resize: "vertical" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Object.keys(NOTE_CARD_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: 20, height: 20, borderRadius: "50%", padding: 0,
                  background: NOTE_CARD_COLORS[c].bg, border: `2px solid ${color === c ? NOTE_CARD_COLORS[c].text : NOTE_CARD_COLORS[c].border}`,
                }}
              />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!body.trim()} className="btn-primary" style={{ ...primaryBtn, opacity: body.trim() ? 1 : 0.5 }}>Save note</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState text="No notes yet. Jot something down above." />
      ) : (
        <>
          {pinned.length > 0 && (
            <div style={{ columns: "220px", columnGap: 12, marginBottom: 12 }}>
              {pinned.map((n) => <NoteCard key={n.id} note={n} onTogglePin={() => setPinned(n.id, !n.pinned)} onRemove={() => removeNote(n.id)} />)}
            </div>
          )}
          <div style={{ columns: "220px", columnGap: 12 }}>
            {rest.map((n) => <NoteCard key={n.id} note={n} onTogglePin={() => setPinned(n.id, !n.pinned)} onRemove={() => removeNote(n.id)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function NoteCard({ note, onTogglePin, onRemove }) {
  const col = NOTE_CARD_COLORS[note.color] || NOTE_CARD_COLORS.yellow;
  return (
    <div
      className="hoverable"
      style={{
        breakInside: "avoid", marginBottom: 12, borderRadius: 14, padding: 14,
        background: col.bg, border: `1px solid ${col.border}`,
        boxShadow: "0 4px 14px rgba(15,23,42,0.05)", transition: "box-shadow .15s ease, transform .15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
        {note.title && <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: col.text }}>{note.title}</div>}
        <div style={{ flex: note.title ? 0 : 1 }} />
        <button onClick={onTogglePin} title={note.pinned ? "Unpin" : "Pin"} style={{ background: "none", border: "none", padding: 0, color: note.pinned ? col.text : "#C2C9D1" }}>
          <Pin size={14} fill={note.pinned ? col.text : "none"} />
        </button>
        <button onClick={onRemove} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      <div style={{ fontSize: 13.5, color: "#000000", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.body}</div>
    </div>
  );
}
