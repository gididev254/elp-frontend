// Embuni ELC — University of Embu schools.
// Single source of truth for the schools list used in registration,
// profile editing, and seed data.
//
// Source: University of Embu official school structure.

export const SCHOOLS = [
  "School of Agriculture",
  "School of Pure & Applied Sciences",
  "School of Nursing",
  "School of Business & Economics",
  "School of Education & Social Sciences",
  "School of Law",
  "School of Engineering",
  "TVET Institute",
] as const;

export type School = (typeof SCHOOLS)[number];
