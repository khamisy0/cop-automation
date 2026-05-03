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
