export const STATUS_COLORS = {
  New:      '#60a5fa',
  Hot:      '#f0930a',
  Nurture:  '#a78bfa',
  Enrolled: '#22c55e',
  Dead:     '#5c6278',
};

export const SOURCE_COLORS = {
  Enquiry:    '#60a5fa',
  'Cold Call': '#f0930a',
  Referral:   '#22c55e',
};

export const CONN_COLORS = {
  Connected:  '#22c55e',
  'No Answer': '#5c6278',
  Busy:       '#f0930a',
  Invalid:    '#ef4444',
};

export const AVATAR_PALETTES = [
  { bg: '#1e1508', color: '#f0930a' },
  { bg: '#0c1829', color: '#60a5fa' },
  { bg: '#0b1f0f', color: '#22c55e' },
  { bg: '#120f2a', color: '#a78bfa' },
  { bg: '#1a0808', color: '#ef4444' },
  { bg: '#071e1c', color: '#2dd4bf' },
];

export function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function avatarPalette(id) {
  return AVATAR_PALETTES[id % AVATAR_PALETTES.length];
}

export function fmtSecs(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function fmtDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function daysSince(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function daysUntil(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((d.getTime() - Date.now()) / 86400000);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isStale(lead, decayDays = 7) {
  return (
    daysSince(lead.last_called_at) >= decayDays &&
    lead.status !== 'Enrolled' &&
    lead.status !== 'Dead'
  );
}

export function sortLeads(leads, mode) {
  const list = [...leads];
  if (mode === 'priority') {
    const srcOrder  = { Enquiry: 0, Referral: 1, 'Cold Call': 2 };
    const statOrder = { Hot: 0, New: 1, Nurture: 2, Enrolled: 3, Dead: 4 };
    list.sort((a, b) => {
      const sd = (srcOrder[a.source] ?? 9) - (srcOrder[b.source] ?? 9);
      if (sd !== 0) return sd;
      return (statOrder[a.status] ?? 9) - (statOrder[b.status] ?? 9);
    });
  } else if (mode === 'followup') {
    list.sort((a, b) => new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at));
  } else if (mode === 'recent') {
    list.sort((a, b) => new Date(b.last_called_at) - new Date(a.last_called_at));
  } else if (mode === 'stale') {
    list.sort((a, b) => new Date(a.last_called_at) - new Date(b.last_called_at));
  }
  return list;
}
