import { useState } from "react";
import { Film, Clapperboard, Tv } from "lucide-react";
import { LIFESTYLE_COLORS } from "../../lib/constants";
import { deleteBtn, ghostBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, SectionHeader, SubHeader } from "../shared/Misc";
import StarRating from "../shared/StarRating";
import { useWatchItems } from "../../hooks/useWatchItems";

export default function MoviesView({ userId }) {
  const { items, loading, addItem, setWatched, setRating, removeItem } = useWatchItems(userId);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Movie");
  const col = LIFESTYLE_COLORS.movies;

  const add = () => {
    if (!title.trim()) return;
    addItem(title, type);
    setTitle("");
  };

  const toWatch = items.filter((i) => i.status !== "Watched");
  const watched = items.filter((i) => i.status === "Watched");

  return (
    <div>
      <SectionHeader title="Movies & TV" subtitle="What to watch next." Icon={Film} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Add a movie or show..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <div style={{ display: "flex", gap: 4 }}>
          {["Movie", "TV Show"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${type === t ? col.border : "#E5E9ED"}`,
                background: type === t ? col.bg : "#fff",
                color: type === t ? col.text : "#93A0AD",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              {t === "Movie" ? <Clapperboard size={14} /> : <Tv size={14} />}
              {t}
            </button>
          ))}
        </div>
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      {!loading && watched.length > 0 && (
        <div style={{ fontSize: 12.5, color: col.text, fontWeight: 700, marginBottom: 14, background: col.bg, display: "inline-block", padding: "5px 12px", borderRadius: 999 }}>
          🍿 {watched.length} watched
        </div>
      )}

      <SubHeader>Watchlist</SubHeader>
      {toWatch.length === 0 ? (
        <EmptyState text="Nothing queued up. Add a movie or show above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {toWatch.map((it) => (
            <WatchRow key={it.id} item={it} col={col} onToggle={() => setWatched(it.id, it.status !== "Watched")} onRate={(r) => setRating(it.id, r)} onRemove={() => removeItem(it.id)} />
          ))}
        </div>
      )}

      {watched.length > 0 && (
        <>
          <SubHeader>Watched</SubHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {watched.map((it) => (
              <WatchRow key={it.id} item={it} col={col} onToggle={() => setWatched(it.id, it.status !== "Watched")} onRate={(r) => setRating(it.id, r)} onRemove={() => removeItem(it.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WatchRow({ item, col, onToggle, onRate, onRemove }) {
  const watched = item.status === "Watched";
  return (
    <div className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: watched ? "#fff" : col.bg, border: `1px solid ${watched ? "#F1EEE9" : col.border}` }}>
      <button
        onClick={onToggle}
        title={watched ? "Move back to watchlist" : "Mark watched"}
        style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${watched ? col.border : "#DCD5C8"}`, background: watched ? col.bg : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: col.text }}
      >
        {watched ? "✓" : ""}
      </button>
      {item.type === "Movie" ? <Clapperboard size={15} color={col.text} style={{ flexShrink: 0 }} /> : <Tv size={15} color={col.text} style={{ flexShrink: 0 }} />}
      <div style={{ flex: 1, fontSize: 14, textDecoration: watched ? "none" : "none", opacity: watched ? 0.8 : 1 }}>{item.title}</div>
      {watched && <StarRating value={item.rating} onChange={onRate} color={col} />}
      <button onClick={onRemove} className="btn-delete" style={deleteBtn}>×</button>
    </div>
  );
}
