import { useState } from "react";
import { Repeat } from "lucide-react";
import { HABIT_COLOR, SUGGESTED_HABITS, cardStyle } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn, suggestionChip } from "../../lib/styles";
import { AddRow, EmptyState, SectionHeader } from "../shared/Misc";
import Swatch from "../shared/Swatch";
import { toISO } from "../../lib/dateHelpers";

export default function HabitsView({ habits, onAddHabit, onRemoveHabit, onSetDoneToday }) {
  const [title, setTitle] = useState("");
  const todayISO = toISO(new Date());

  const addHabit = (t) => {
    onAddHabit(t !== undefined ? t : title);
    if (t === undefined) setTitle("");
  };

  const addedTitles = new Set(habits.map((h) => h.title.toLowerCase()));
  const available = SUGGESTED_HABITS.filter((s) => !addedTitles.has(s.toLowerCase()));

  return (
    <div>
      <SectionHeader title="Habits" subtitle="Progress over perfection. Missing a day doesn't reset anything." Icon={Repeat} tint={HABIT_COLOR} />

      <AddRow>
        <input placeholder="Add a custom habit..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
        <button onClick={() => addHabit()} className="btn-primary" style={primaryBtn}>Add</button>
      </AddRow>

      {available.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11.5, color: "#B4BCC5", alignSelf: "center", marginRight: 2 }}>Suggested:</span>
          {available.map((s) => (
            <button key={s} onClick={() => addHabit(s)} style={suggestionChip}>+ {s}</button>
          ))}
        </div>
      )}

      {habits.length === 0 ? (
        <EmptyState text="No habits in your list yet. Add one above or tap a suggestion." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.map((h) => {
            const doneToday = h.doneDates.includes(todayISO);
            return (
              <div key={h.id} className="hoverable" style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <Swatch color={doneToday ? HABIT_COLOR : { bg: "#F1F3F5", border: "#DCE1E6" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{h.title}</div>
                  <div style={{ fontSize: 11.5, color: "#8B95A1", marginTop: 1 }}>{h.doneDates.length} day{h.doneDates.length === 1 ? "" : "s"} total</div>
                </div>
                <button
                  onClick={() => onSetDoneToday(h.id, !doneToday)}
                  style={{
                    padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                    border: `1.5px solid ${doneToday ? HABIT_COLOR.border : "#E2E8F0"}`,
                    background: doneToday ? HABIT_COLOR.bg : "#fff",
                    color: doneToday ? HABIT_COLOR.text : "#8A93A0",
                  }}
                >
                  {doneToday ? "✓ Done today" : "Mark done"}
                </button>
                <button onClick={() => onRemoveHabit(h.id)} className="btn-delete" style={deleteBtn}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
