import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { getCallLogs, deleteLead, updateLead, WHATSAPP_TEMPLATES } from '../db';
import { STATUS_COLORS, CONN_COLORS, initials, avatarPalette, fmtDate, fmtDuration, daysSince, daysUntil, isStale } from '../utils';

const COURSES = [
  'Professional 6', 'Professional 5', 'IT 2', 'Commerce', 'Management 2',
  'Medicaal 2', 'Designer 2', 'Examcoach 2', 'Engg 2', 'Others 2',
  'ACCA', 'CA', 'CMA', 'CFA', 'CPA', 'EA', 'CMA USA'
];
const STATUSES = ['New','Hot','Nurture','Enrolled','Dead'];
const SOURCES  = ['Enquiry','Cold Call','Referral'];

function SourcePill({ src }) {
  const cls = src === 'Enquiry' ? 'pill-enquiry' : src === 'Cold Call' ? 'pill-coldcall' : 'pill-referral';
  return <span className={`pill ${cls}`}>{src}</span>;
}

function InfoCard({ label, value, valueColor }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: '8px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: valueColor || 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
    </div>
  );
}

export default function LeadDetail({ onDial }) {
  const { selectedLead, callLogsCache, setLeadLogs, settings, updateLeadInStore, removeLeadFromStore, setSelectedLead } = useAppStore();
  const [editMode,    setEditMode]    = useState(false);
  const [editForm,    setEditForm]    = useState({});
  const [delConfirm,  setDelConfirm]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [waMenuOpen,  setWaMenuOpen]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedLead) return;
    setEditMode(false); setDelConfirm(false);
    if (!callLogsCache[selectedLead.id]) {
      getCallLogs(selectedLead.id).then(logs => setLeadLogs(selectedLead.id, logs));
    }
  }, [selectedLead?.id]);

  if (!selectedLead) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/>
        </svg>
        <span>Select a lead</span>
        <span style={{ fontSize: 9, color: 'var(--t3)' }}>Click any row on the left</span>
      </div>
    );
  }

  const lead  = selectedLead;
  const pal   = avatarPalette(lead.id);
  const logs  = (callLogsCache[lead.id] || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  const stale = isStale(lead, settings?.decay_days ?? 7);
  const since = daysSince(lead.last_called_at);
  const until = daysUntil(lead.next_follow_up_at);
  const fuLabel = until < 0 ? '⚠ Overdue' : until === 0 ? 'Today' : `in ${until}d — ${fmtDate(lead.next_follow_up_at)}`;
  const fuColor = until < 0 ? 'var(--red)' : 'var(--amber)';

  const startEdit = () => {
    setEditForm({ name: lead.name, phone: lead.phone, email: lead.email || '',
      course: lead.course, source: lead.source, status: lead.status });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!editForm.phone?.trim()) return;
    const cleanForm = {
      ...editForm,
      name: editForm.name?.trim() || 'Unnamed Lead'
    };
    setSaving(true);
    
    await updateLead(lead.id, cleanForm);
    updateLeadInStore(lead.id, cleanForm);
    setSelectedLead({ ...lead, ...cleanForm });
    setSaving(false); setEditMode(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteLead(lead.id);
    removeLeadFromStore(lead.id);
  };

  // WhatsApp with pre-filled template
  const openWA = (templateIdx) => {
    const tpl = WHATSAPP_TEMPLATES[templateIdx]
      .replace(/{name}/g, lead.name.split(' ')[0])
      .replace(/{course}/g, lead.course);
    const num = lead.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(tpl)}`, '_blank');
    setWaMenuOpen(false);
  };

  // ─── Edit mode ───────────────────────────────────────────
  if (editMode) {
    const iStyle = { width: '100%', height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
      borderRadius: 4, padding: '0 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t0)', outline: 'none' };
    const selStyle = { ...iStyle, appearance: 'none', cursor: 'pointer',
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpolyline points='0,1 5,5 10,1' fill='none' stroke='%235c6278' stroke-width='1.5'/%3E%3C/svg%3E\")",
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundColor: 'var(--bg2)' };
    const fl = k => e => setEditForm(p => ({ ...p, [k]: e.target.value }));
    const fg = (label, key, el) => (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        {el}
      </div>
    );
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)' }}>Edit Lead</span>
          <button className="btn btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 9 }} onClick={() => setEditMode(false)}>Cancel</button>
        </div>
        {fg('Name *', 'name', <input style={iStyle} value={editForm.name} onChange={fl('name')} />)}
        {fg('Phone *', 'phone', <input style={iStyle} value={editForm.phone} onChange={fl('phone')} />)}
        {fg('Email', 'email', <input style={iStyle} value={editForm.email} onChange={fl('email')} type="email" />)}
        {fg('Course', 'course', <select style={selStyle} value={editForm.course} onChange={fl('course')}>
          {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {fg('Source', 'source', <select style={selStyle} value={editForm.source} onChange={fl('source')}>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>)}
          {fg('Status', 'status', <select style={selStyle} value={editForm.status} onChange={fl('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="btn btn-green" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, position: 'relative' }} onClick={() => setWaMenuOpen(false)}>

      {/* Mobile Back Button */}
      {isMobile && (
        <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 12, height: 32, gap: 4 }}
          onClick={() => setSelectedLead(null)}>
          ← Back to list
        </button>
      )}

      {/* Decay warning */}
      {stale && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 4,
          padding: '7px 12px', marginBottom: 10, fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠ No contact in {since} days — lead going cold
        </div>
      )}

      {/* Follow-up bar */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4,
        padding: '6px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 10 }}>
        <span style={{ color: 'var(--t2)' }}>Next follow-up</span>
        <span style={{ color: fuColor }}>{fuLabel}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--bd)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: pal.bg, color: pal.color, fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${pal.color}44` }}>
          {initials(lead.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{lead.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 6 }}>{lead.course}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <SourcePill src={lead.source} />
            <span className={`pill pill-${lead.status.toLowerCase()}`}>{lead.status}</span>
          </div>
        </div>
        {/* Edit / Delete icons */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={startEdit} title="Edit lead" style={{
            width: 28, height: 28, borderRadius: 4, background: 'none', border: '1px solid var(--bd)',
            color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => setDelConfirm(true)} title="Delete lead" style={{
            width: 28, height: 28, borderRadius: 4, background: 'none', border: '1px solid var(--bd)',
            color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {delConfirm && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 4,
          padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', marginBottom: 8 }}>
            Delete {lead.name} and all their call history? This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="btn btn-red" style={{ height: 28, fontSize: 9 }} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button className="btn btn-ghost" style={{ height: 28, fontSize: 9 }} onClick={() => setDelConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contact info */}
      <div className="section-title">Contact info</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <InfoCard label="Phone" value={lead.phone} />
        <InfoCard label="Email" value={lead.email} />
        <InfoCard label="Last called" value={fmtDate(lead.last_called_at)} />
        <InfoCard label="Source" value={lead.source}
          valueColor={lead.source === 'Enquiry' ? 'var(--blue)' : lead.source === 'Cold Call' ? 'var(--amber)' : 'var(--green)'} />
      </div>

      {/* Call history */}
      {logs.length > 0 && (
        <>
          <div className="section-title">Call history ({logs.length})</div>
          {logs.slice(0, 5).map((log, i) => (
            <div key={log.id ?? i} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 4, padding: '9px 12px', marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                  color: CONN_COLORS[log.connection_status] }}>{log.connection_status}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{fmtDate(log.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)' }}>{fmtDuration(log.duration_seconds)}</span>
                {log.rating && <span style={{ color: 'var(--amber)', fontSize: 11 }}>{'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}</span>}
              </div>
              {log.feedback_customer && (
                <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 5, lineHeight: 1.4,
                  borderLeft: '2px solid var(--bd)', paddingLeft: 8 }}>{log.feedback_customer}</div>
              )}
              {log.objection_tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                  {log.objection_tags.map(t => (
                    <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '1px 6px',
                      borderRadius: 2, background: 'var(--abg)', color: 'var(--amber)', border: '1px solid var(--adim)' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 7, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--bd)', position: 'relative' }}>
        <button className="btn btn-green" style={{ flex: 2 }} onClick={() => onDial(lead)}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.56 3.4 2 2 0 0 1 3.53 1.23h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l1.59-1.59a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          DIAL
        </button>

        {/* WhatsApp with template picker */}
        <div style={{ position: 'relative', flex: 1 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setWaMenuOpen(o => !o)}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.998 0C5.372 0 0 5.373 0 12.004c0 2.117.554 4.104 1.522 5.831L.057 23.882l6.198-1.625A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.625 0 11.998 0zm.002 21.818a9.818 9.818 0 0 1-5.006-1.371l-.36-.214-3.68.965.981-3.595-.234-.37a9.817 9.817 0 0 1-1.503-5.233c0-5.422 4.413-9.836 9.836-9.836 5.424 0 9.837 4.414 9.837 9.836s-4.413 9.818-9.871 9.818z"/>
            </svg>
            WA ▾
          </button>
          {waMenuOpen && (
            <div style={{ position: 'absolute', bottom: '110%', right: 0, width: 260,
              background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 5,
              boxShadow: '0 4px 16px rgba(0,0,0,.4)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)',
                padding: '6px 10px', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase' }}>
                Choose template
              </div>
              {WHATSAPP_TEMPLATES.map((tpl, i) => (
                <div key={i} onClick={() => openWA(i)} style={{
                  padding: '8px 10px', fontSize: 11, color: 'var(--t1)', cursor: 'pointer',
                  borderBottom: i < 2 ? '1px solid var(--bd)' : 'none', lineHeight: 1.4,
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {tpl.replace(/{name}/g, lead.name.split(' ')[0]).replace(/{course}/g, lead.course).slice(0, 80)}…
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
