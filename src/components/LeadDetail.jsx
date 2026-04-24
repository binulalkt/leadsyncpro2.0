import { useEffect } from 'react';
import { useAppStore } from '../store';
import { getCallLogs } from '../db';
import { STATUS_COLORS, CONN_COLORS, initials, avatarPalette, fmtDate, fmtDuration, daysSince, daysUntil, isStale } from '../utils';

function SourcePill({ src }) {
  const cls = src === 'Enquiry' ? 'pill-enquiry' : src === 'Cold Call' ? 'pill-coldcall' : 'pill-referral';
  return <span className={`pill ${cls}`}>{src}</span>;
}

function InfoCard({ label, value, valueColor }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: '8px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: valueColor || 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

export default function LeadDetail({ onDial }) {
  const { selectedLead, callLogsCache, setLeadLogs, settings } = useAppStore();

  useEffect(() => {
    if (!selectedLead) return;
    if (callLogsCache[selectedLead.id]) return;
    getCallLogs(selectedLead.id).then(logs => setLeadLogs(selectedLead.id, logs));
  }, [selectedLead?.id]);

  if (!selectedLead) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/>
        </svg>
        <span>Select a lead</span>
      </div>
    );
  }

  const lead   = selectedLead;
  const pal    = avatarPalette(lead.id);
  const logs   = (callLogsCache[lead.id] || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  const stale  = isStale(lead, settings?.decay_days ?? 7);
  const since  = daysSince(lead.last_called_at);
  const until  = daysUntil(lead.next_follow_up_at);
  const fuLabel = until < 0 ? '⚠ Overdue' : until === 0 ? 'Today' : `in ${until}d — ${fmtDate(lead.next_follow_up_at)}`;
  const fuColor = until < 0 ? 'var(--red)' : until === 0 ? 'var(--amber)' : 'var(--amber)';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

      {/* Decay warning */}
      {stale && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 4,
          padding: '8px 12px', marginBottom: 12, fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/>
          </svg>
          No contact in {since} days — lead going cold
        </div>
      )}

      {/* Follow-up bar */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4,
        padding: '7px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 10 }}>
        <span style={{ color: 'var(--t2)' }}>Next follow-up</span>
        <span style={{ color: fuColor }}>{fuLabel}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--bd)' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
          background: pal.bg, color: pal.color, fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${pal.color}44` }}>
          {initials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{lead.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 6 }}>{lead.course}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <SourcePill src={lead.source} />
            <span className={`pill pill-${lead.status.toLowerCase()}`}>{lead.status}</span>
          </div>
        </div>
      </div>

      {/* Contact info grid */}
      <div className="section-title">Contact info</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        <InfoCard label="Phone" value={lead.phone} />
        <InfoCard label="Email" value={lead.email} />
        <InfoCard label="Last called" value={fmtDate(lead.last_called_at)} />
        <InfoCard label="Source" value={lead.source} valueColor={lead.source === 'Enquiry' ? 'var(--blue)' : lead.source === 'Cold Call' ? 'var(--amber)' : 'var(--green)'} />
      </div>

      {/* Call history */}
      {logs.length > 0 && (
        <>
          <div className="section-title">Call history ({logs.length})</div>
          {logs.slice(0, 5).map((log, i) => (
            <div key={log.id ?? i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 4, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
                  color: CONN_COLORS[log.connection_status] }}>
                  {log.connection_status}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
                  {fmtDate(log.timestamp)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)' }}>
                  {fmtDuration(log.duration_seconds)}
                </span>
                {log.rating && (
                  <span style={{ color: 'var(--amber)', fontSize: 11 }}>
                    {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                  </span>
                )}
              </div>
              {log.feedback_customer && (
                <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 5, lineHeight: 1.4,
                  borderLeft: '2px solid var(--bd)', paddingLeft: 8 }}>
                  {log.feedback_customer}
                </div>
              )}
              {log.objection_tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                  {log.objection_tags.map(t => (
                    <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '1px 6px',
                      borderRadius: 2, background: 'var(--abg)', color: 'var(--amber)', border: '1px solid var(--adim)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--bd)' }}>
        <button className="btn btn-green" style={{ flex: 2 }} onClick={() => onDial(lead)}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.4 2 2 0 0 1 3.53 1.23h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l1.59-1.59a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          DIAL
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }}
          onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g,'')}`)}>
          WA
        </button>
      </div>
    </div>
  );
}
