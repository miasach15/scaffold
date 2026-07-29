import { TONE } from "../../lib/constants";
import { daysUntil, toISO } from "../../lib/dateHelpers";

export default function StripRow({ label, days, chips, chipStyle, chipLabel, onChipClick, onDropTask }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `56px repeat(7, 1fr)`, borderBottom: "1px solid #EDEDED", minHeight: 28 }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{label}</div>
      {days.map((d) => {
        const iso = toISO(d);
        const dayChips = chips.filter((c) => c.date === iso);
        return (
          <div
            key={iso}
            onDragOver={onDropTask ? (e) => e.preventDefault() : undefined}
            onDrop={onDropTask ? (e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
                if (data.taskId) onDropTask(data.taskId, iso);
              } catch {}
            } : undefined}
            style={{ borderLeft: "1px solid #F4F6F8", padding: "3px", display: "flex", flexDirection: "column", gap: 3 }}
          >
            {dayChips.map((c) => {
              const col = chipStyle(c);
              const overdue = !c.done && daysUntil(c.date) < 0;
              const content = <>{chipLabel(c)}</>;
              const style = {
                fontSize: 10.5, textAlign: "left", padding: "2px 6px", borderRadius: 6,
                background: col.bg, border: `1px solid ${overdue ? TONE.danger.border : col.border}`, color: col.text,
                boxShadow: overdue ? `inset 2px 0 0 ${TONE.danger.text}` : "none",
                textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.55 : 1, fontWeight: 600,
                cursor: c.kind === "task" ? "grab" : onChipClick ? "pointer" : "default",
              };
              const dragProps = c.kind === "task" ? { draggable: true, onDragStart: (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: c.id })) } : {};
              return onChipClick ? (
                <button key={c.kind + c.id} onClick={() => onChipClick(c)} style={style} {...dragProps}>{content}</button>
              ) : (
                <div key={c.kind + c.id} style={style} {...dragProps}>{content}</div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
