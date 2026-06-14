import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { STATUS_COLORS, initials, avatarPalette, fmtDate, daysUntil } from '../utils';

export default function TodayView({ onDial, onSelect }) {
  const { leads, setSelectedLead, callLogsCache } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Follow-up leads filter ─────────────────────────────────
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginRight: 8 }}>
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

  // ─── Monthly Targets & Forecasting calculations ─────────────
  const target = 30;
  
  const enrolledCount = useMemo(() => {
    // Current month enrollments
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return leads.filter(l => 
      l.status === 'Enrolled' && 
      l.last_called_at && 
      new Date(l.last_called_at) >= startOfMonth
    ).length;
  }, [leads]);

  const targetPct = Math.min(Math.round((enrolledCount / target) * 100), 100);

  const forecastLeads = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return leads
      .filter(l => {
        if (l.status !== 'Hot' && l.status !== 'Nurture') return false;
        if (!l.next_follow_up_at) return false;
        const fuDate = new Date(l.next_follow_up_at);
        return fuDate >= startOfMonth && fuDate <= endOfMonth;
      })
      .map(l => {
        const logs = callLogsCache[l.id] || [];
        const ratings = logs.filter(log => log.rating).map(log => log.rating);
        const maxRating = ratings.length ? Math.max(...ratings) : 3;

        let confidence = '50%';
        let labelColor = 'var(--t2)';
        if (l.status === 'Hot' && maxRating >= 4) {
          confidence = '90% (High)';
          labelColor = 'var(--green)';
        } else if (l.status === 'Hot' || maxRating >= 3) {
          confidence = '70% (Med)';
          labelColor = 'var(--amber)';
        } else {
          confidence = '40% (Low)';
          labelColor = 'var(--t2)';
        }

        return {
          ...l,
          confidence,
          labelColor,
          estCloseDate: l.next_follow_up_at
        };
      })
      .sort((a, b) => new Date(a.estCloseDate) - new Date(b.estCloseDate));
  }, [leads, callLogsCache]);

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      
      {/* Left Panel: Due Follow-ups */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16,
        borderRight: isMobile ? 'none' : '1px solid var(--bd)', borderBottom: isMobile ? '1px solid var(--bd)' : 'none' }}>
        
        {todayLeads.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11, minHeight: 200 }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1}>
              <rect x={3} y={4} width={18} height={18} rx={2}/><line x1={16} y1={2} x2={16} y2={6}/>
              <line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
              <path d="M9 16l2 2 4-4"/>
            </svg>
            <span>All caught up!</span>
            <span style={{ fontSize: 9, color: 'var(--t3)' }}>No follow-ups due today</span>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', marginBottom: 14 }}>
              {todayLeads.length} follow-up{todayLeads.length > 1 ? 's' : ''} due
              {overdue.length > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>· {overdue.length} overdue</span>}
            </div>
            {overdue.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="section-title" style={{ color: 'var(--red)' }}>Overdue</div>
                {overdue.map(l => <Row key={l.id} lead={l} />)}
              </div>
            )}
            {today.length > 0 && (
              <div>
                <div className="section-title">Today</div>
                {today.map(l => <Row key={l.id} lead={l} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Panel: Target Quota & Pipeline Forecast */}
      <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, background: 'var(--bg0)' }}>
        
        {/* Quota Progress Tracker */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 14, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 6 }}>
            🏆 Monthly Quota Tracker
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginBottom: 8 }}>
            <span>Target Progress ({monthName})</span>
            <span>{enrolledCount} / {target} Enrolls</span>
          </div>
          
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${targetPct}%`, background: 'var(--green)', borderRadius: 3, transition: 'width .3s' }} />
          </div>
          
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
            {target > enrolledCount ? (
              <span>Close <strong style={{ color: 'var(--amber)' }}>{target - enrolledCount} more</strong> to reach your monthly goal!</span>
            ) : (
              <span style={{ color: 'var(--green)' }}>🎉 Monthly Target Exceeded! Strong work coach!</span>
            )}
          </div>
        </div>

        {/* Pipeline Closure Forecast */}
        <div>
          <div className="section-title" style={{ color: 'var(--blue)' }}>Closure Forecast (This Month)</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
            Estimated closure dates based on next follow-up schedule.
          </div>

          {forecastLeads.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
              No hot/nurture follow-ups scheduled this month.
            </div>
          ) : (
            forecastLeads.map(l => (
              <div key={l.id} onClick={() => handleSelect(l)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: '10px 12px',
                  marginBottom: 6, cursor: 'pointer', transition: 'all .1s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bd2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t0)' }}>{l.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: l.labelColor, fontWeight: 600 }}>{l.confidence}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
                  <span>{l.course}</span>
                  <span>Est: {fmtDate(l.estCloseDate)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
