import { useMemo } from 'react';
import { useAppStore } from '../store';
import { STATUS_COLORS, SOURCE_COLORS, initials, avatarPalette, fmtDate, daysUntil } from '../utils';

export default function TodayView({ onDial, onSelect }) {
  const { leads, setSelectedLead } = useAppStore();

  const todayLeads = useMemo(() => {
    return leads
      .filter(l => {
        if (l.status === 'Dead' || l.status === 'Enrolled') return false;
        const d = daysUntil(l.next_follow_up_at);
        return d <= 0; // overdue or today
      })
      .sort((a, b) => new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at));
  }, [leads]);

  const overdue = todayLeads.filter(l => daysUntil(l.next_follow_up_at) < 0);
  const today   = todayLeads.filter(l => daysUntil(l.next_follow_up_at) === 0);

  const handleSelect = (lead) => { setSelectedLead(lead); onSelect(lead); };

  const Row = ({ lead }) => {
    const pal = avatarPalette(lead.id);
    const d   = daysUntil(lead.next_follow_up_at);
    return (
      <div onClick={() => handleSelect(lead)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4,
          marginBottom: 5, cursor: 'pointer', transition: 'border-color .1s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bd2)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: pal.bg, color: pal.color, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {initials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 1 }}>{lead.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{lead.course}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9,
            color: d < 0 ? 'var(--red)' : 'var(--amber)',
            background: d < 0 ? 'var(--rbg)' : 'var(--abg)',
            border: `1px solid ${d < 0 ? 'var(--rdim)' : 'var(--adim)'}`,
            borderRadius: 3, padding: '1px 6px' }}>
            {d < 0 ? `${Math.abs(d)}d overdue` : 'Today'}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: STATUS_COLORS[lead.status] }}>{lead.status}</span>
        </div>
        <button className="btn btn-green" style={{ height: 28, padding: '0 10px', fontSize: 9, flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onDial(lead); }}>
          DIAL
        </button>
      </div>
    );
  };

  if (todayLeads.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1}>
          <rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/>
          <line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
          <path d="M9 16l2 2 4-4"/>
        </svg>
        <span>All caught up!</span>
        <span style={{ fontSize: 9, color: 'var(--t3)' }}>No follow-ups due today</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', marginBottom: 14 }}>
        {todayLeads.length} follow-up{todayLeads.length > 1 ? 's' : ''} due
        {overdue.length > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>· {overdue.length} overdue</span>}
      </div>
      {overdue.length > 0 && (
        <>
          <div className="section-title" style={{ color: 'var(--red)' }}>Overdue</div>
          {overdue.map(l => <Row key={l.id} lead={l} />)}
        </>
      )}
      {today.length > 0 && (
        <>
          <div className="section-title">Today</div>
          {today.map(l => <Row key={l.id} lead={l} />)}
        </>
      )}
    </div>
  );
}
