export const TAGS = {
  education: { label: "Bildung", dotClass: "poi-education" },
  healthcare: { label: "Gesundheit", dotClass: "poi-healthcare" },
  supermarket: { label: "Supermarkt", dotClass: "poi-supermarket" },
  park: { label: "Park", dotClass: "poi-park" },
  public_transport: { label: "ÖPNV", dotClass: "poi-public_transport" },
  restaurant: { label: "Restaurant", dotClass: "poi-restaurant" },
};

export const CATEGORIES = Object.keys(TAGS);

export const LABELS = CATEGORIES.reduce((acc, k) => {
  acc[k] = TAGS[k].label;
  return acc;
}, {});

export const getLabel = (key) => TAGS[key]?.label ?? key;
export const getDotClass = (key) => TAGS[key]?.dotClass ?? "";
export const isValidCategory = (key) => key in TAGS;
