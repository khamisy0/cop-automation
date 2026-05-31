export const COUNTRY_CODES = [
  { code: '01', name: 'Lebanon' },
  { code: '02', name: 'UAE' },
  { code: '03', name: 'Kuwait' },
  { code: '04', name: 'Bahrain' },
  { code: '05', name: 'Jordan' },
  { code: '06', name: 'Qatar' },
  { code: '08', name: 'Egypt' },
  { code: '10', name: 'KSA' },
];

export const countryNameToCodeMap: Record<string, string> = COUNTRY_CODES.reduce((acc, curr) => {
  acc[curr.name] = curr.code;
  return acc;
}, {} as Record<string, string>);

export const countryCodeToNameMap: Record<string, string> = COUNTRY_CODES.reduce((acc, curr) => {
  acc[curr.code] = curr.name;
  return acc;
}, {} as Record<string, string>);

// Seasonality treats Intimissimi (56) and IUMAN UOMO (B6) as ONE brand: they
// share a single master sheet and a single set of reference rows. To avoid
// duplicating every row across two brand codes, the group writes/looks up under
// a single canonical `storeCode`. `codes` lists every code the group owns — used
// for stats and for wiping legacy duplicates (e.g. old "B6" rows) on re-upload.
export const SEASONALITY_BRAND_GROUPS: {
  id: string;
  label: string;
  storeCode: string;
  codes: string[];
}[] = [
  { id: 'int-uomo', label: 'Intimissimi / IUMAN UOMO', storeCode: '56', codes: ['56', 'B6'] },
  { id: 'cal',      label: 'Calzedonia',                storeCode: '55', codes: ['55'] },
  { id: 'tez',      label: 'Tezenis',                   storeCode: '57', codes: ['57'] },
];

export type JoinKey = 'mancode+color' | 'mancode';

export const BRANDS: { code: string; name: string; supplier: string; joinKey: JoinKey }[] = [
  { code: '56', name: 'Intimissimi', supplier: '5601', joinKey: 'mancode+color' },
  { code: 'B6', name: 'IUMAN UOMO', supplier: 'B601', joinKey: 'mancode+color' },
  { code: '37', name: 'Punt Roma', supplier: '3701', joinKey: 'mancode' },
];
