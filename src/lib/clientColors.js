// Per-client brand colors, used consistently for that client's avatar and
// any chart series (e.g. the combined Progress Trend) across the app.
export const CLIENT_COLORS = {
  MCFC: '#6DADDF',
  PVL: '#F44914',
  WF: '#EB0A2C',
  SO: '#96D600',
};

export function clientColor(code, fallback = '#2A2AEA') {
  return CLIENT_COLORS[code] || fallback;
}
