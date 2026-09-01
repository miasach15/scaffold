import { useState } from "react";
import { useCategoryColors, useCategoryKeys } from "../../hooks/CategoryColorsContext";
import { TONE } from "../../lib/constants";
import { pad, timeToDecimal } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle, labelStyle, modalStyle, overlayStyle, primaryBtn } from "../../lib/styles";

export default function QuickAddModal({ initial, event, hasFollowing, onClose, onSave, onUpdate, onDelete }) {
  const CATEGORY_COLORS = useCategoryColors();
  const categoryKeys = useCategoryKeys();
  const isEdit = !!event;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event ? event.date : initial.date);
  const [time, setTime] = useState(() => {
    if (event) return event.start != null ? `${pad(Math.floor(event.start))}:${pad(Math.round((event.start % 1) * 60))}` : "09:00";
    return `${pad(initial.hour ?? 9)}:00`;
  });
  const [durationHours, setDurationHours] = useState(event?.duration != null ? Math.floor(event.duration / 60) : 1);
  const [durationMinutes, setDurationMinutes] = useState(event?.duration != null ? event.duration % 60 : 0);
  const [allDay, setAllDay] = useState(event ? event.start == null : initial.hour == null);
  const [category, setCategory] = useState(event?.category || "Personal");
  const [repeat, setRepeat] = useState("None");
  const [customDays, setCustomDays] = useState([]);

  const totalDuration = Math.max(5, Math.round(durationHours) * 60 + Math.round(durationMinutes));

  const toggleCustomDay = (d) => setCustomDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));

  const save = () => {
    const payload = {
      title: title.trim(), date, category,
      start: allDay ? null : timeToDecimal(time),
      duration: allDay ? null : totalDuration,
    };
    if (isEdit) onUpdate({ id: event.id, ...payload, repeat, customDays });
    else onSave({ kind: "event", ...payload, repeat, customDays });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11.5, color: "#93A0AD", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>{isEdit ? "Edit event" : "Add event"}</div>
        <label style={labelStyle}>Title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chem lecture" style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 10 }}>Category</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categoryKeys.map((c) => (
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
        <label style={{ ...labelStyle, marginTop: 10 }}>{isEdit ? "Repeat going forward" : "Repeat"}</label>
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={inputStyle}>
          <option value="None">Doesn't repeat</option>
          <option value="Daily">Every day</option>
          <option value="Weekdays">Every weekday (Mon–Fri)</option>
          <option value="Weekly">Every week, same day</option>
          <option value="Custom">Custom days</option>
        </select>
        {repeat === "Custom" && (
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, d) => {
              const active = customDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleCustomDay(d)}
                  style={{
                    width: 40, padding: "6px 0", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    border: `1.5px solid ${active ? "var(--primary, #7B6EF0)" : "#E5E9ED"}`,
                    background: active ? "var(--primary-tint, #E7E3FC)" : "#fff",
                    color: active ? "var(--primary-dark, #5849C4)" : "#93A0AD",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {isEdit && repeat !== "None" && (
          <div style={{ fontSize: 11.5, color: "#93A0AD", marginTop: 6, lineHeight: 1.4 }}>
            This turns this event into a repeating series. Future occurrences will be added when you save.
          </div>
        )}
        {isEdit && confirmDelete ? (
          <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center" }}>
            <button onClick={() => onDelete(event.id, "one")} className="btn-ghost" style={{ ...ghostBtn, color: TONE.danger.text, borderColor: TONE.danger.border }}>This one</button>
            <button onClick={() => onDelete(event.id, "following")} className="btn-ghost" style={{ ...ghostBtn, color: TONE.danger.text, borderColor: TONE.danger.border }}>This + following</button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost" style={ghostBtn}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            {isEdit && (
              <button
                onClick={() => (hasFollowing ? setConfirmDelete(true) : onDelete(event.id, "one"))}
                className="btn-ghost"
                style={{ ...ghostBtn, color: TONE.danger.text, borderColor: TONE.danger.border }}
              >
                Delete
              </button>
            )}
            <button onClick={onClose} className="btn-ghost" style={ghostBtn}>Cancel</button>
            <button
              disabled={!title.trim()}
              onClick={save}
              className="btn-primary"
              style={{ ...primaryBtn, flex: 1, opacity: title.trim() ? 1 : 0.5 }}
            >
              {isEdit ? "Save changes" : "Add event"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
