import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

export default function Topbar({ callActive, onAddLead, onImport }) {
  const { page, setPage, callLead, leads } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const todayCount = leads.filter(l => {
    if (l.status === 'Dead' || l.status === 'Enrolled') return false;
    const d = l.next_follow_up_at ? new Date(l.next_follow_up_at) : null;
    return d && (d - Date.now()) / 86400000 <= 0;
  }).length;

  const NAV = [
    { key: 'leads',     label: 'Leads' },
    { key: 'today',     label: 'Today', badge: todayCount },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
      background: 'var(--bg1)', borderBottom: '1px solid var(--bd)',
      padding: isMobile ? '0 8px' : '0 16px', height: 48, flexShrink: 0, zIndex: 200,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: isMobile ? 11 : 13, fontWeight: 600, color: 'var(--amber)', letterSpacing: '.05em' }}>
        LeadSync<span style={{ color: 'var(--t1)' }}>Pro</span>
      </span>
      {!isMobile && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, background: 'var(--abg)',
          color: 'var(--amber)', border: '1px solid var(--adim)', borderRadius: 3, padding: '2px 7px' }}>
          AVODHA CRM
        </span>
      )}

      <div style={{ display: 'flex', gap: isMobile ? 2 : 3, marginLeft: isMobile ? 4 : 10 }}>
        {NAV.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setPage(key)} style={{
            fontFamily: 'var(--mono)', fontSize: isMobile ? 9 : 10, padding: isMobile ? '4px 8px' : '4px 12px', borderRadius: 4,
            border: '1px solid', cursor: 'pointer', transition: 'all .12s', position: 'relative',
            background: page === key ? 'var(--bg2)' : 'none',
            borderColor: page === key ? 'var(--amber)' : 'var(--bd)',
            color: page === key ? 'var(--amber)' : 'var(--t2)',
          }}>
            {label}
            {badge > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14,
                borderRadius: '50%', background: 'var(--red)', color: '#fff',
                fontFamily: 'var(--mono)', fontSize: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 7 }}>
        {callActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)',
            fontSize: 9, color: 'var(--red)', background: 'var(--rbg)',
            border: '1px solid var(--rdim)', borderRadius: 4, padding: isMobile ? '3px 6px' : '3px 10px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
              animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
            {isMobile ? 'LIVE' : `LIVE — ${callLead?.name}`}
          </div>
        )}
        <button onClick={onImport} style={{ height: 30, padding: isMobile ? '0 8px' : '0 10px', borderRadius: 4,
          background: 'none', border: '1px solid var(--bd)', color: 'var(--t2)',
          fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all .12s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--t2)'; }}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1={12} y1={3} x2={12} y2={15}/>
          </svg>
          {!isMobile && "Import CSV"}
        </button>
        <button onClick={onAddLead} style={{ height: 30, padding: isMobile ? '0 8px' : '0 12px', borderRadius: 4,
          background: 'var(--gbg)', border: '1px solid var(--gdim)', color: 'var(--green)',
          fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, transition: 'all .12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--gdim)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--gbg)'}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/>
          </svg>
          {!isMobile && "Add Lead"}
        </button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
