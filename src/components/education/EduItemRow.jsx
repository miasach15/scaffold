import { useMemo, useState } from "react";
import { EDU_TYPE_COLORS } from "../../lib/constants";
import { dateRangeISO, formatShortDate, toISO } from "../../lib/dateHelpers";
import { ghostBtn, inputStyle } from "../../lib/styles";
import { deleteBtn } from "../../lib/styles";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";
import UrgencyBadge from "../shared/UrgencyBadge";

export default function EduItemRow({ item, onToggleDone, onRemove, onAddSession, tag }) {
  const col = EDU_TYPE_COLORS[item.type] || EDU_TYPE_COLORS.Homework;
  const todayISOlocal = toISO(new Date());
  const options = useMemo(() => dateRangeISO(todayISOlocal, item.dueDate), [item.dueDate]);
  const [selDate, setSelDate] = useState(options[0] || todayISOlocal);
  const actionLabel = item.type === "Test" ? "Study session" : "Sub-task";

  return (
    <div className="hoverable" style={{ border: `1px solid ${col.border}`, borderRadius: 14, padding: "10px 12px", marginBottom: 8, background: item.done ? "#fff" : col.bg, transition: "box-shadow .15s ease, transform .15s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Checkbox checked={item.done} onClick={() => onToggleDone(item.id)} color={col} />
        <Swatch color={col} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.title}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
            <div style={{ fontSize: 10, color: col.text, background: col.bg, display: "inline-block", padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>{item.type}</div>
            {item.subject && <div style={{ fontSize: 10, color: "#93A0AD" }}>{item.subject}</div>}
          </div>
        </div>
        {tag ? <div style={{ fontSize: 11, color: "#93A0AD", fontWeight: 600 }}>{tag}</div> : <UrgencyBadge iso={item.dueDate} done={item.done} />}
        <button onClick={() => onRemove(item.id)} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <select value={selDate} onChange={(e) => setSelDate(e.target.value)} style={{ ...inputStyle, fontSize: 12, flex: 1, padding: "6px 8px" }}>
          {options.map((d) => <option key={d} value={d}>{formatShortDate(d)}</option>)}
        </select>
        <button onClick={() => onAddSession(item.id, selDate)} className="btn-ghost" style={{ ...ghostBtn, fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>+ {actionLabel}</button>
      </div>
    </div>
  );
}
