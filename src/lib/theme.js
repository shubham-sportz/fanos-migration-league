export const COLORS = {
  primary: '#2A2AEA',
  primaryDark: '#1C1CB8',
  bg: '#FFFFFF',
  bgSecondary: '#F6F7FF',
  card: '#FFFFFF',
  text: '#1E1E2D',
  textSecondary: '#6B7280',
  border: '#E8E8F2',
  ok: '#15803D',
  okBg: '#E9F7EF',
  warn: '#B45309',
  warnBg: '#FDF4E5',
  bad: '#DC2626',
  badBg: '#FDECEC',
  grey: '#9CA3AF',
  greyBg: '#F3F4F6',
  block: '#374151',
  blockBg: '#EEEFF3',
};

export const NA = 'NA';

export const isNA = (v) => v === null || v === undefined || v === NA || v === '';

// Hours can now come in as decimals (e.g. from Jira worklogs), so summing
// several of them can produce floating-point noise (15.8 + 17.1 =
// 32.900000000000006) — round to 1 decimal wherever hours are accumulated
// or displayed.
export const round1 = (n) => Math.round(n * 10) / 10;

export const STATUS_META = {
  won: { label: 'Won', fg: COLORS.ok, bg: COLORS.okBg },
  late: { label: 'Late', fg: COLORS.warn, bg: COLORS.warnBg },
  delivered: { label: 'Delivered', fg: COLORS.ok, bg: COLORS.okBg },
  inprogress: { label: 'In progress', fg: COLORS.primary, bg: '#EFEFFF' },
  onTrack: { label: 'On track', fg: COLORS.ok, bg: COLORS.okBg },
  atRisk: { label: 'At risk', fg: COLORS.warn, bg: COLORS.warnBg },
  critical: { label: 'Critical', fg: COLORS.bad, bg: COLORS.badBg },
  upcoming: { label: 'Upcoming', fg: COLORS.grey, bg: COLORS.greyBg },
  blocked: { label: 'Blocked', fg: COLORS.block, bg: COLORS.blockBg },
  pending: { label: 'Data pending', fg: COLORS.grey, bg: COLORS.greyBg },
};
