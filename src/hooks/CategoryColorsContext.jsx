import { createContext, useContext } from "react";
import { CATEGORY_COLORS as DEFAULT_CATEGORY_COLORS } from "../lib/constants";

const CategoryColorsContext = createContext(DEFAULT_CATEGORY_COLORS);

export function CategoryColorsProvider({ value, children }) {
  return <CategoryColorsContext.Provider value={value}>{children}</CategoryColorsContext.Provider>;
}

// Returns the current user's resolved {Education, Personal, Health, People} color
// map. Falls back to the default palette when no provider is present (e.g. auth
// screen, or before a profile has loaded).
export function useCategoryColors() {
  return useContext(CategoryColorsContext);
}
