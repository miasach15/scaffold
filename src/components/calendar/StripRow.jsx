import { TONE } from "../../lib/constants";
import { daysUntil, toISO } from "../../lib/dateHelpers";

// rollOverdueToToday: an item that's overdue and still not done stops showing on its
// original (past) date and shows on today instead, every day, until it's done — so it
// doesn't just sit invisible on a date you've scrolled away from. Excludes "event" chips
// even on a row that has this on (the All-day row now mixes events with Tests) — a past
// event isn't "overdue," it just already happened, and events don't carry a real done
// state to check against.
export default function StripRow({ label, days, chips, chipStyle, chipLabel, onChipClick, onDropItem, onAddClick, emphasis, rollOverdueToToday }) {
  const todayISO = toISO(new Date());
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`,
      borderBottom: emphasis ? "1.5px solid #E5E9ED" : "1px solid #EDEDED", minHeight: emphasis ? 54 : 28,
      background: emphasis ? "#FAFAFC" : "transparent",
    }}>
      <div style={{ fontSize: emphasis ? 12 : 10, color: emphasis ? "#4A5568" : "#9CA3AF", padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>{label}</div>
      {days.map((d) => {
        const iso = toISO(d);
        const dayChips = chips.filter((c) => {
          if (rollOverdueToToday && c.kind !== "event" && !c.done && daysUntil(c.date) < 0) return iso === todayISO;
          return c.date === iso;
        });
        return (
          <div
            key={iso}
            onClick={onAddClick ? () => onAddClick(iso) : undefined}
            onDragOver={onDropItem ? (e) => e.preventDefault() : undefined}
            onDrop={onDropItem ? (e) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
                if (data.id) onDropItem(data.kind, data.id, iso);
              } catch {}
            } : undefined}
            style={{ borderLeft: "1px solid #F4F6F8", padding: emphasis ? "5px" : "3px", display: "flex", flexDirection: "column", gap: emphasis ? 4 : 3, cursor: onAddClick ? "pointer" : undefined, minWidth: 0 }}
          >
            {dayChips.map((c) => {
              const col = chipStyle(c);
              const overdue = c.kind !== "event" && !c.done && daysUntil(c.date) < 0;
              const content = <>{chipLabel(c)}</>;
              const style = {
                fontSize: emphasis ? 11.5 : 10.5, textAlign: "left", padding: emphasis ? "4px 8px" : "2px 6px", borderRadius: 6,
                background: col.bg, border: `${emphasis ? 1.5 : 1}px solid ${overdue ? TONE.carried.border : col.border}`, color: col.text,
                textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.55 : 1, fontWeight: 700,
                cursor: c.kind === "task" || c.kind === "event" ? "grab" : onChipClick ? "pointer" : "default",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", width: "100%", maxWidth: "100%",
              };
              const dragProps = c.kind === "task" || c.kind === "event"
                ? { draggable: true, onDragStart: (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ kind: c.kind, id: c.id })) }
                : {};
              const fullLabel = chipLabel(c);
              return onChipClick ? (
                <button key={c.kind + c.id} title={fullLabel} onClick={(e) => { e.stopPropagation(); onChipClick(c); }} style={style} {...dragProps}>{content}</button>
              ) : (
                <div key={c.kind + c.id} title={fullLabel} onClick={(e) => e.stopPropagation()} style={style} {...dragProps}>{content}</div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
