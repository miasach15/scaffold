import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { LIFESTYLE_COLORS } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, SectionHeader, SubHeader } from "../shared/Misc";
import StarRating from "../shared/StarRating";
import { useRestaurants } from "../../hooks/useRestaurants";

export default function RestaurantsView({ userId }) {
  const { restaurants, loading, addRestaurant, setTried, setRating, setNotes, removeRestaurant } = useRestaurants(userId);
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const col = LIFESTYLE_COLORS.restaurants;

  const add = () => {
    if (!name.trim()) return;
    addRestaurant(name, cuisine);
    setName(""); setCuisine("");
  };

  const toTry = restaurants.filter((r) => r.status !== "Tried");
  const tried = restaurants.filter((r) => r.status === "Tried");

  return (
    <div>
      <SectionHeader title="Restaurants" subtitle="Places to try." Icon={UtensilsCrossed} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Restaurant name..." value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Cuisine (optional)" value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ ...inputStyle, width: 160 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      {!loading && tried.length > 0 && (
        <div style={{ fontSize: 12.5, color: col.text, fontWeight: 700, marginBottom: 14, background: col.bg, display: "inline-block", padding: "5px 12px", borderRadius: 999 }}>
          🍽️ {tried.length} tried
        </div>
      )}

      <SubHeader>Want to Try</SubHeader>
      {toTry.length === 0 ? (
        <EmptyState text="No spots on the list yet. Add one above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {toTry.map((r) => (
            <RestaurantRow key={r.id} r={r} col={col} onToggle={() => setTried(r.id, r.status !== "Tried")} onRate={(v) => setRating(r.id, v)} onNotes={(v) => setNotes(r.id, v)} onRemove={() => removeRestaurant(r.id)} />
          ))}
        </div>
      )}

      {tried.length > 0 && (
        <>
          <SubHeader>Tried</SubHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tried.map((r) => (
              <RestaurantRow key={r.id} r={r} col={col} onToggle={() => setTried(r.id, r.status !== "Tried")} onRate={(v) => setRating(r.id, v)} onNotes={(v) => setNotes(r.id, v)} onRemove={() => removeRestaurant(r.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RestaurantRow({ r, col, onToggle, onRate, onNotes, onRemove }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const tried = r.status === "Tried";
  return (
    <div className="hoverable" style={{ padding: "10px 12px", borderRadius: 12, background: tried ? "#fff" : col.bg, border: `1px solid ${tried ? "#F1EEE9" : col.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onToggle}
          title={tried ? "Move back to want-to-try" : "Mark tried"}
          style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${tried ? col.border : "#DCD5C8"}`, background: tried ? col.bg : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: col.text }}
        >
          {tried ? "✓" : ""}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
          {r.cuisine && <div style={{ fontSize: 11.5, color: "#93A0AD" }}>{r.cuisine}</div>}
        </div>
        {tried && <StarRating value={r.rating} onChange={onRate} color={col} />}
        <button onClick={() => setNotesOpen((o) => !o)} style={{ fontSize: 11, color: col.text, background: "none", border: "none", fontWeight: 600 }}>{r.notes ? "Notes" : "+ Note"}</button>
        <button onClick={onRemove} className="btn-delete" style={deleteBtn}>×</button>
      </div>
      {notesOpen && (
        <textarea
          value={r.notes || ""}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="What to order, vibe, anything worth remembering..."
          rows={2}
          style={{ ...inputStyle, width: "100%", marginTop: 8, fontSize: 12.5, resize: "vertical" }}
        />
      )}
    </div>
  );
}
