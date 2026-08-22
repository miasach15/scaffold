import { useState } from "react";
import { Percent, Plus } from "lucide-react";
import { useCategoryColors } from "../../hooks/CategoryColorsContext";
import { ghostBtn, inputStyle } from "../../lib/styles";
import { EmptyState, SectionHeader } from "../shared/Misc";
import ClassCard from "./ClassCard";

const NO_SUBJECT_KEY = "";
const NO_SUBJECT_LABEL = "No subject";

export default function GradesView({
  eduItems,
  classes,
  onSetGradingMode,
  onAddCategory,
  onRenameCategory,
  onSetCategoryWeight,
  onRemoveCategory,
  onRemoveClass,
  onSetScore,
  onSetItemCategory,
  onRemoveItem,
  onEnsureClass,
}) {
  const CATEGORY_COLORS = useCategoryColors();
  const [newClassName, setNewClassName] = useState("");

  const itemsBySubject = (key) => eduItems.filter((e) => (e.subject || NO_SUBJECT_KEY) === key);

  const subjectKeys = Array.from(new Set([
    ...eduItems.map((e) => e.subject || NO_SUBJECT_KEY),
    ...classes.map((c) => c.subject),
  ]));
  // Only show "No subject" if there's actually something ungraded sitting there.
  const orderedKeys = subjectKeys
    .filter((k) => k !== NO_SUBJECT_KEY || itemsBySubject(k).length > 0)
    .sort((a, b) => {
      if (a === NO_SUBJECT_KEY) return 1;
      if (b === NO_SUBJECT_KEY) return -1;
      return a.localeCompare(b);
    });

  const addClass = () => {
    if (!newClassName.trim()) return;
    onEnsureClass(newClassName.trim());
    setNewClassName("");
  };

  return (
    <div>
      <SectionHeader title="Grades" subtitle="One setup per class — total points, or your own weighted categories." Icon={Percent} tint={CATEGORY_COLORS.Education} />

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input
          placeholder="Add a class (e.g. AP Bio)..." value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addClass()}
          style={{ ...inputStyle, flex: 1, maxWidth: 280 }}
        />
        <button onClick={addClass} style={{ ...ghostBtn, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} strokeWidth={2.5} /> Add class
        </button>
      </div>

      {orderedKeys.length === 0 ? (
        <EmptyState text="No classes yet. Add one above, or it'll show up automatically once you enter a subject on an Education item." />
      ) : (
        orderedKeys.map((key) => (
          <ClassCard
            key={key || "__none__"}
            subject={key}
            label={key || NO_SUBJECT_LABEL}
            cls={classes.find((c) => c.subject === key)}
            items={itemsBySubject(key)}
            onSetGradingMode={onSetGradingMode}
            onAddCategory={onAddCategory}
            onRenameCategory={onRenameCategory}
            onSetCategoryWeight={onSetCategoryWeight}
            onRemoveCategory={onRemoveCategory}
            onRemoveClass={onRemoveClass}
            onSetScore={onSetScore}
            onSetItemCategory={onSetItemCategory}
            onRemoveItem={onRemoveItem}
          />
        ))
      )}
    </div>
  );
}
