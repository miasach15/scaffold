import { Sparkles } from "lucide-react";
import { CATEGORY_COLORS, EDU_TYPE_COLORS, PRIMARY, PRIORITY_COLORS, TASK_COLOR, TONE, cardStyle } from "../../lib/constants";
import { decimalToTimeLabel } from "../../lib/dateHelpers";
import Checkbox from "../shared/Checkbox";
import Swatch from "../shared/Swatch";

export default function TodaysPriorities({ priorities, todayEvents, profileName }) {
  const priorityColor = (item) => {
    if (item.colorKind === "goal") return CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Personal;
    if (item.colorKind === "edu") return EDU_TYPE_COLORS[item.type] || EDU_TYPE_COLORS.Homework;
    return TASK_COLOR;
  };
  const hasAnything = priorities.length > 0 || todayEvents.length > 0;

  return (
    <div style={{ ...cardStyle, padding: 0, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, #B9C4E0, #C9BEEA, #A9D9C0)` }} />
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: hasAnything ? 10 : 2, display: "flex", alignItems: "center", gap: 7 }}>
          <Sparkles size={15} color={PRIMARY} strokeWidth={2.3} />
          {profileName ? `Hi ${profileName}, here's Today's Priorities` : "Today's Priorities"}
        </div>
        {!hasAnything ? (
          <div style={{ fontSize: 13, color: "#B4BCC5" }}>Nothing due or overdue today. Enjoy the clear runway.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {priorities.map((p) => {
              const col = priorityColor(p);
              const isTask = p.colorKind === "task";
              const tagEl = p.overdue ? (
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TONE.danger.text }}>Overdue</div>
              ) : p.tag ? (
                <div style={{ fontSize: 11.5, color: "#93A0AD" }}>{p.tag}</div>
              ) : (
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TONE.warn.text }}>Due today</div>
              );
              if (isTask) {
                return (
                  <div
                    key={p.key}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%",
                      padding: "8px 10px", borderRadius: 10, border: `1px solid ${p.overdue ? TONE.danger.border : col.border}`,
                      background: p.overdue ? TONE.danger.bg : col.bg,
                    }}
                  >
                    <Checkbox checked={false} onClick={p.onClick} color={col} />
                    <button onClick={p.onFocus} style={{ flex: 1, textAlign: "left", fontSize: 13.5, color: "#000000", background: "none", border: "none", padding: 0 }}>{p.title}</button>
                    {p.priority && p.priority !== "Low" && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[p.priority].text, background: "rgba(255,255,255,0.6)", border: `1px solid ${PRIORITY_COLORS[p.priority].border}`, padding: "2px 7px", borderRadius: 999 }}>{p.priority}</div>
                    )}
                    {tagEl}
                  </div>
                );
              }
              return (
                <button
                  key={p.key}
                  onClick={p.onClick}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, textAlign: "left", width: "100%",
                    padding: "8px 10px", borderRadius: 10, border: `1px solid ${p.overdue ? TONE.danger.border : col.border}`,
                    background: p.overdue ? TONE.danger.bg : col.bg,
                  }}
                >
                  <Swatch color={col} size={20} />
                  <div style={{ flex: 1, fontSize: 13.5, color: "#000000" }}>{p.title}</div>
                  {tagEl}
                </button>
              );
            })}
            {todayEvents.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px" }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: (CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Personal).border, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13.5, color: "#000000" }}>{e.title}</div>
                <div style={{ fontSize: 11.5, color: "#93A0AD" }}>{decimalToTimeLabel(e.start)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
