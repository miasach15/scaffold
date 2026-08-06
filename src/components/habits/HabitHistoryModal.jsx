import { useState } from "react";
import { X } from "lucide-react";
import { HABIT_COLOR, serifFont } from "../../lib/constants";
import { ghostBtn, modalStyle, overlayStyle } from "../../lib/styles";
import { addDays, addMonths, dayLabel, monthLabel, monthMatrix, startOfWeek, toISO } from "../../lib/dateHelpers";

export default function HabitHistoryModal({ habit, onSetDone, onClose }) {
  const [month, setMonth] = useState(new Date());
  const todayISO = toISO(new Date());
  const doneSet = new Set(habit.doneDates);
  const cells = monthMatrix(month);
  const weekStart = startOfWeek(new Date());
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => dayLabel(addDays(weekStart, i)));

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontFamily: serifFont, fontSize: 19, fontWeight: 700 }}>{habit.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", padding: 4, color: "#9CA3AF" }}><X size={17} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 16 }}>{habit.doneDates.length} day{habit.doneDates.length === 1 ? "" : "s"} total. Click any day to toggle it.</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => setMonth((m) => addMonths(m, -1))} className="btn-ghost" style={{ ...ghostBtn, padding: "5px 10px" }}>‹</button>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{monthLabel(month)}</div>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="btn-ghost" style={{ ...ghostBtn, padding: "5px 10px" }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {weekdayLabels.map((l) => (
            <div key={l} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#B4BCC5" }}>{l[0]}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map(({ date, inMonth }) => {
            const iso = toISO(date);
            const isDone = doneSet.has(iso);
            const isToday = iso === todayISO;
            return (
              <button
                key={iso}
                onClick={() => onSetDone(habit.id, iso, !isDone)}
                title={iso}
                style={{
                  aspectRatio: "1", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                  border: isToday ? `1.5px solid ${HABIT_COLOR.text}` : "1px solid transparent",
                  background: isDone ? HABIT_COLOR.bg : "#F4F6F8",
                  color: isDone ? HABIT_COLOR.text : inMonth ? "#8A93A0" : "#D1D5DB",
                  opacity: inMonth ? 1 : 0.5,
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{ ...ghostBtn, width: "100%", marginTop: 18 }}>Done</button>
      </div>
    </div>
  );
}
