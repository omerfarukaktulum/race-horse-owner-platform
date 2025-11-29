/**
 * Hardcoded list of Turkish racecourses (Hipodrom)
 * Used in dropdowns instead of fetching from database
 */
export const RACECOURSES = [
  'İstanbul Veliefendi',
  'Ankara 75. Yıl',
  'Adana Yeşiloba',
  'Bursa Osmangazi',
  'Diyarbakır',
  'Elazığ',
  'İzmir Şirinyer',
  'Kocaeli Kartepe',
  'Şanlıurfa',
  'Antalya',
] as const

export type RacecourseName = typeof RACECOURSES[number]

