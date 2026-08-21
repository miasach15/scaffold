import { createContext, useContext } from "react";
import { CATEGORY_COLORS as DEFAULT_CATEGORY_COLORS, DEFAULT_CATEGORY_KEYS } from "../lib/constants";

const CategoryColorsContext = createContext(DEFAULT_CATEGORY_COLORS);
const CategoryKeysContext = createContext(DEFAULT_CATEGORY_KEYS);

export function CategoryColorsProvider({ value, keys, children }) {
  return (
    <CategoryColorsContext.Provider value={value}>
      <CategoryKeysContext.Provider value={keys || DEFAULT_CATEGORY_KEYS}>{children}</CategoryKeysContext.Provider>
    </CategoryColorsContext.Provider>
  );
}

// Returns the current user's resolved category color map, keyed by category name (a
// custom set now, not just the original Education/Personal/Health/People). Falls back
// to the default palette when no provider is present (e.g. auth screen, or before a
// profile has loaded).
export function useCategoryColors() {
  return useContext(CategoryColorsContext);
}

// Returns the current user's ordered list of category names — use this instead of the
// old hardcoded CATEGORY_KEYS wherever a picker needs to enumerate them, so renamed/
// added/removed categories actually show up.
export function useCategoryKeys() {
  return useContext(CategoryKeysContext);
}
