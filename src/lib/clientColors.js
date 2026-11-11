// Per-client brand colors, used consistently for that client's avatar and
// any chart series (e.g. the combined Progress Trend) across the app.
export const CLIENT_COLORS = {
  MCFC: '#6DADDF',
  KKR: '#3B215E',
  TKR: '#D6246E',
  LAKR: '#0F7C8C',
  ADKR: '#C8102E',
  DCW: '#17479E',
  DCA: '#4F7BD8',
  KC: '#B8860B',
  WF: '#EB0A2C',
  SO: '#96D600',
};

export function clientColor(code, fallback = '#2A2AEA') {
  return CLIENT_COLORS[code] || fallback;
}
