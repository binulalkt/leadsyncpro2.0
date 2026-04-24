import { useAppStore } from '../store';

export default function Topbar({ callActive }) {
  const { page, setPage, callLead } = useAppStore();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg1)', borderBottom: '1px solid var(--bd)',
      padding: '0 16px', height: 48, flexShrink: 0, position: 'sticky', top: 0, zIndex: 200,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--amber)', letterSpacing: '.05em' }}>
        LeadSync<span style={{ color: 'var(--t1)' }}>Pro</span>
      </span>

      <span style={{
        fontFamily: 'var(--mono)', fontSize: 9, background: 'var(--abg)',
        color: 'var(--amber)', border: '1px solid var(--adim)', borderRadius: 3, padding: '2px 7px',
      }}>AVODHA CRM</span>

      <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
        {[['leads', 'Leads'], ['analytics', 'Analytics']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 12px', borderRadius: 4,
              border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              background: page === key ? 'var(--bg2)' : 'none',
              borderColor: page === key ? 'var(--amber)' : 'var(--bd)',
              color: page === key ? 'var(--amber)' : 'var(--t2)',
            }}
          >{label}</button>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {callActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)',
            background: 'var(--rbg)', border: '1px solid var(--rdim)',
            borderRadius: 4, padding: '3px 10px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
              animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
            LIVE — {callLead?.name}
          </div>
        )}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', background: 'var(--bg2)',
          border: '1px solid var(--bd)', borderRadius: 3, padding: '3px 8px' }}>
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
