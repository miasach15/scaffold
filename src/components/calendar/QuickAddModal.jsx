import { useState } from "react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { pad, timeToDecimal } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, labelStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

export default function QuickAddModal({ initial, onClose, onSave }) {
  const CATEGORY_COLORS = useCategoryColors();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(`${pad(initial.hour ?? 9)}:00`);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [allDay, setAllDay] = useState(initial.hour == null);
  const [category, setCategory] = useState("Personal");
  const [repeat, setRepeat] = useState("None");

  const totalDuration = Math.max(5, Math.round(durationHours) * 60 + Math.round(durationMinutes));

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>Add event</div>
        <label style={labelStyle}>Title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chem lecture" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 10 }}>Category</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Education", "Personal", "Health", "People"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${category === c ? CATEGORY_COLORS[c].border : "#E5E9ED"}`,
                background: category === c ? CATEGORY_COLORS[c].bg : "#fff",
                color: category === c ? CATEGORY_COLORS[c].text : "#93A0AD",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
          {!allDay && (
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>
        {!allDay && (
          <>
            <label style={{ ...labelStyle, marginTop: 10 }}>Duration</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" min={0} max={24} value={durationHours} onChange={(e) => setDurationHours(e.target.value === "" ? 0 : Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
              <span style={{ fontSize: 12.5, color: "#93A0AD" }}>hrs</span>
              <input type="number" min={0} max={59} step={5} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value === "" ? 0 : Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
              <span style={{ fontSize: 12.5, color: "#93A0AD" }}>min</span>
            </div>
          </>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5568", marginTop: 10 }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All-day event (shows in the "All day" row instead of a time slot)
        </label>
        <label style={{ ...labelStyle, marginTop: 10 }}>Repeat</label>
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={inputStyle}>
          <option value="None">Doesn't repeat</option>
          <option value="Daily">Every day</option>
          <option value="Weekdays">Every weekday (Mon–Fri)</option>
          <option value="Weekly">Every week</option>
        </select>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} className="btn-ghost" style={ghostBtn}>Cancel</button>
          <button
            disabled={!title.trim()}
            onClick={() => onSave({ kind: "event", title: title.trim(), date, start: allDay ? null : timeToDecimal(time), duration: allDay ? null : totalDuration, category, repeat })}
            className="btn-primary"
            style={{ ...primaryBtn, flex: 1, opacity: title.trim() ? 1 : 0.5 }}
          >
            Add event
          </button>
        </div>
      </div>
    </div>
  );
}
