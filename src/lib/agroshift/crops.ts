/**
 * Suggested crop names for the crop selectors. The documented API has no crop-list
 * endpoint, so these are common crops in The Gambia offered as shortcuts only —
 * every selector also accepts any other crop typed by the farmer.
 */
export const SUGGESTED_CROPS = [
  "Groundnut",
  "Early millet (souna)",
  "Late millet (sanyo)",
  "Sorghum",
  "Maize",
  "Upland rice",
  "Lowland rice",
  "Cowpea",
  "Sesame",
  "Fonio (findo)",
  "Bambara groundnut",
  "Cassava",
  "Watermelon",
  "Okra",
  "Onion",
  "Tomato",
] as const;

export const FALLOW = "Fallow (no crop)";
export const UNKNOWN_CROP = "Not sure";
export const OTHER_CROP = "__other__";
