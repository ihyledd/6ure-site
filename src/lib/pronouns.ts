/**
 * Common pronouns for forms. Used with a searchable dropdown/datalist like timezone.
 * Listed in a sensible order: most common first, then variations.
 * Users can type to filter suggestions or enter custom pronouns.
 */
export const PRONOUNS_LIST = [
  "he/him",
  "she/her",
  "they/them",
  "he/they",
  "she/they",
  "they/he",
  "they/she",
  "it/its",
  "xe/xem",
  "xe/xir",
  "ze/zir",
  "ze/hir",
  "ey/em",
  "ne/nem",
  "fae/faer",
  "ae/aer",
  "thon/thons",
  "ve/ver",
  "e/em",
  "per/pers",
  "co/cos",
  "any",
  "ask me",
  "prefer not to say",
] as const;

export type PronounsOption = (typeof PRONOUNS_LIST)[number];
