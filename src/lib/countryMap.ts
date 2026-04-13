// Maps category name prefixes (before the |) to flag emoji + display label
// Covers all prefixes seen in Xtream provider category names

export type CountryFilter = {
  code: string
  flag: string
  label: string
}

export const COUNTRY_MAP: Record<string, { flag: string; label: string }> = {
  // North America
  US:   { flag: '🇺🇸', label: 'USA' },
  CA:   { flag: '🇨🇦', label: 'Canada' },

  // UK & Ireland
  UK:   { flag: '🇬🇧', label: 'UK' },
  IE:   { flag: '🇮🇪', label: 'Ireland' },

  // Western Europe
  FR:   { flag: '🇫🇷', label: 'France' },
  DE:   { flag: '🇩🇪', label: 'Germany' },
  ES:   { flag: '🇪🇸', label: 'Spain' },
  PT:   { flag: '🇵🇹', label: 'Portugal' },
  IT:   { flag: '🇮🇹', label: 'Italy' },
  NL:   { flag: '🇳🇱', label: 'Netherlands' },
  BE:   { flag: '🇧🇪', label: 'Belgium' },
  AT:   { flag: '🇦🇹', label: 'Austria' },
  CH:   { flag: '🇨🇭', label: 'Switzerland' },
  MA:   { flag: '🇲🇹', label: 'Malta' },

  // Nordics
  SE:   { flag: '🇸🇪', label: 'Sweden' },
  DK:   { flag: '🇩🇰', label: 'Denmark' },
  NO:   { flag: '🇳🇴', label: 'Norway' },
  FI:   { flag: '🇫🇮', label: 'Finland' },
  IS:   { flag: '🇮🇸', label: 'Iceland' },

  // Eastern Europe
  PL:   { flag: '🇵🇱', label: 'Poland' },
  CZ:   { flag: '🇨🇿', label: 'Czech Rep.' },
  HU:   { flag: '🇭🇺', label: 'Hungary' },
  RO:   { flag: '🇷🇴', label: 'Romania' },
  RU:   { flag: '🇷🇺', label: 'Russia' },
  BG:   { flag: '🇧🇬', label: 'Bulgaria' },
  LT:   { flag: '🇱🇹', label: 'Lithuania' },
  KZ:   { flag: '🇰🇿', label: 'Kazakhstan' },

  // Balkans
  AL:   { flag: '🇦🇱', label: 'Albania' },
  SR:   { flag: '🇷🇸', label: 'Serbia' },
  BH:   { flag: '🇧🇦', label: 'Bosnia' },
  HR:   { flag: '🇭🇷', label: 'Croatia' },
  MK:   { flag: '🇲🇰', label: 'Macedonia' },
  SI:   { flag: '🇸🇮', label: 'Slovenia' },
  CG:   { flag: '🇲🇪', label: 'Montenegro' },
  EXYU: { flag: '🏳️', label: 'Ex-Yugoslavia' },

  // South / Eastern Mediterranean
  GR:   { flag: '🇬🇷', label: 'Greece' },
  CY:   { flag: '🇨🇾', label: 'Cyprus' },
  IL:   { flag: '🇮🇱', label: 'Israel' },
  TR:   { flag: '🇹🇷', label: 'Turkey' },

  // Middle East & Arabic
  AR:   { flag: '🌍', label: 'Arabic' },
  IR:   { flag: '🇮🇷', label: 'Iran' },
  KU:   { flag: '🏴', label: 'Kurdish' },

  // South Asia & Central Asia
  ASIA: { flag: '🌏', label: 'Asia' },
  AG:   { flag: '🇦🇫', label: 'Afghanistan' },
  UZ:   { flag: '🇺🇿', label: 'Uzbekistan' },
  AZ:   { flag: '🇦🇿', label: 'Azerbaijan' },
  AM:   { flag: '🇦🇲', label: 'Armenia' },
  GE:   { flag: '🇬🇪', label: 'Georgia' },

  // East & Southeast Asia
  JP:   { flag: '🇯🇵', label: 'Japan' },
  KR:   { flag: '🇰🇷', label: 'South Korea' },
  TN:   { flag: '🇹🇼', label: 'Taiwan' },
  HK:   { flag: '🇭🇰', label: 'Hong Kong' },
  TH:   { flag: '🇹🇭', label: 'Thailand' },
  VI:   { flag: '🇻🇳', label: 'Vietnam' },
  PH:   { flag: '🇵🇭', label: 'Philippines' },
  SG:   { flag: '🇸🇬', label: 'Singapore' },
  ID:   { flag: '🇮🇩', label: 'Indonesia' },

  // Pacific
  AU:   { flag: '🇦🇺', label: 'Australia' },
  NZ:   { flag: '🇳🇿', label: 'New Zealand' },

  // Latin America
  BR:   { flag: '🇧🇷', label: 'Brazil' },
  LA:   { flag: '🌎', label: 'Latin America' },
  BO:   { flag: '🇧🇴', label: 'Bolivia' },
  SU:   { flag: '🇸🇷', label: 'Suriname' },
  VE:   { flag: '🇻🇪', label: 'Venezuela' },
  CR:   { flag: '🌴', label: 'Caribbean' },

  // Africa
  AFR:  { flag: '🌍', label: 'Africa' },

  // Sports & Specialty (not country-specific)
  TS:   { flag: '🎾', label: 'Tennis' },
  WT:   { flag: '🏏', label: 'Cricket' },
  '4K': { flag: '📺', label: '4K' },
  RX:   { flag: '😌', label: 'Relax' },
  MC:   { flag: '📻', label: 'Radio' },
}

// Extract the prefix code from a category name like "US| SPORT HD" → "US"
export function getCategoryCode(categoryName: string): string {
  const parts = categoryName.split('|')
  if (parts.length < 2) return 'OTHER'
  return parts[0].trim().toUpperCase()
}

// Get unique country filters from a list of category names, in a sensible order
export function getFiltersFromCategories(categoryNames: string[]): CountryFilter[] {
  const seen = new Set<string>()
  const filters: CountryFilter[] = []

  for (const name of categoryNames) {
    const code = getCategoryCode(name)
    if (!seen.has(code) && COUNTRY_MAP[code]) {
      seen.add(code)
      filters.push({ code, ...COUNTRY_MAP[code] })
    }
  }

  return filters
}
