import { useState } from "react";
import { Gift } from "lucide-react";
import { LIFESTYLE_COLORS } from "../../lib/constants";
import { deleteBtn, inputStyle, primaryBtn } from "../../lib/styles";
import { EmptyState, SectionHeader, SubHeader } from "../shared/Misc";
import { GIFT_STATUSES, useGifts } from "../../hooks/useGifts";

const STAGE_EMOJI = { Idea: "\u{1F4A1}", Bought: "\u{1F6CD}️", Wrapped: "\u{1F380}", Given: "\u{1F381}" };

export default function GiftsView({ userId }) {
  const { gifts, setGiftStatus, addGift, removeGift } = useGifts(userId);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [idea, setIdea] = useState("");
  const [price, setPrice] = useState("");
  const col = LIFESTYLE_COLORS.gifts;

  const add = () => {
    if (!recipient.trim() || !idea.trim()) return;
    addGift(recipient, occasion, idea, price ? Number(price) : null);
    setRecipient(""); setOccasion(""); setIdea(""); setPrice("");
  };

  const byRecipient = gifts.reduce((acc, g) => {
    (acc[g.recipient] = acc[g.recipient] || []).push(g);
    return acc;
  }, {});
  const recipients = Object.keys(byRecipient).sort();

  return (
    <div>
      <SectionHeader title="Gift Tracking" subtitle="Ideas for people you love." Icon={Gift} tint={col} />

      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <input placeholder="Who's it for?" value={recipient} onChange={(e) => setRecipient(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <input placeholder="Gift idea..." value={idea} onChange={(e) => setIdea(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} style={{ ...inputStyle, width: 130 }} />
        <input placeholder="$" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inputStyle, width: 80 }} />
        <button onClick={add} className="btn-primary" style={primaryBtn}>Add</button>
      </div>

      {recipients.length === 0 ? (
        <EmptyState text="No gift ideas yet. Add one above." />
      ) : (
        recipients.map((r) => (
          <div key={r} style={{ marginBottom: 18 }}>
            <SubHeader>{r}</SubHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {byRecipient[r].map((g) => (
                <div key={g.id} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: g.status === "Given" ? "#fff" : col.bg, border: `1px solid ${g.status === "Given" ? "#EDEDED" : col.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, textDecoration: g.status === "Given" ? "line-through" : "none", opacity: g.status === "Given" ? 0.6 : 1 }}>{g.idea}</div>
                    {(g.occasion || g.price != null) && (
                      <div style={{ fontSize: 11.5, color: "#93A0AD" }}>{[g.occasion, g.price != null ? `$${g.price}` : null].filter(Boolean).join(" · ")}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setGiftStatus(g.id, GIFT_STATUSES[(GIFT_STATUSES.indexOf(g.status) + 1) % GIFT_STATUSES.length])}
                    title="Click to advance to the next stage"
                    style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, border: `1px solid ${col.border}`, background: "#fff", color: col.text, whiteSpace: "nowrap" }}
                  >
                    {STAGE_EMOJI[g.status]} {g.status}
                  </button>
                  <button onClick={() => removeGift(g.id)} className="btn-delete" style={deleteBtn}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
