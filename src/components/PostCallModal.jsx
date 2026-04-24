import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { addCallLog, updateLead } from '../db';
import { fmtSecs, todayStr } from '../utils';

const CONN_OPTS = [
  { val: 'Connected',  cls: 'green', sub: 'Call answered' },
  { val: 'No Answer',  cls: 't2',    sub: 'Rang, no pickup' },
  { val: 'Busy',       cls: 'amber', sub: 'Line was busy' },
  { val: 'Invalid',    cls: 'red',   sub: 'Wrong / off number' },
];
const STATUS_OPTS = [
  { val: 'New',      color: '#60a5fa' },
  { val: 'Hot',      color: '#f0930a' },
  { val: 'Nurture',  color: '#a78bfa' },
  { val: 'Enrolled', color: '#22c55e' },
  { val: 'Dead',     color: '#5c6278' },
];
const CONN_COLORS_MAP = { Connected: '#22c55e', 'No Answer': '#5c6278', Busy: '#f0930a', Invalid: '#ef4444' };

export default function PostCallModal({ callData, consecutiveNoAnswers, onClose }) {
  const { callLead, milestones, updateLeadInStore, appendLog, closeCall } = useAppStore();

  const [conn,        setConn]        = useState(null);
  const [rating,      setRating]      = useState(0);
  const [hover,       setHover]       = useState(0);
  const [nextDate,    setNextDate]    = useState(todayStr());
  const [nextTime,    setNextTime]    = useState('');
  const [status,      setStatus]      = useState(callLead?.status || 'Hot');
  const [fbCustomer,  setFbCustomer]  = useState('');
  const [fbSelf,      setFbSelf]      = useState('');
  const [ghostAction, setGhostAction] = useState(null);
  const [attempted,   setAttempted]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const isGhost = consecutiveNoAnswers >= 3;

  const missing = useMemo(() => {
    const m = [];
    if (!conn) m.push('connection status');
    if (conn === 'Connected' && rating === 0) m.push('call rating');
    if (!nextDate) m.push('follow-up date');
    return m;
  }, [conn, rating, nextDate]);

  const canSave = missing.length === 0;

  const handleSave = async () => {
    setAttempted(true);
    if (!canSave || saving) return;
    setSaving(true);

    const finalStatus = ghostAction === 'Nurture' ? 'Nurture' : ghostAction === 'Dead' ? 'Dead' : status;
    const followUp    = nextDate ? new Date(`${nextDate}T${nextTime || '09:00'}`) : null;

    const log = {
      lead_id:             callLead.id,
      duration_seconds:    callData.secs,
      connection_status:   conn,
      rating:              conn === 'Connected' ? rating : null,
      feedback_customer:   fbCustomer,
      feedback_self:       fbSelf,
      completed_milestones: callData.checked,
      objection_tags:       callData.objTags,
    };

    const logId = await addCallLog(log);
    await updateLead(callLead.id, {
      status:            finalStatus,
      last_called_at:    new Date(),
      next_follow_up_at: followUp,
    });

    appendLog(callLead.id, { ...log, id: logId, timestamp: new Date() });
    updateLeadInStore(callLead.id, {
      status: finalStatus,
      last_called_at: new Date(),
      next_follow_up_at: followUp,
    });

    setSaved(true);
    setTimeout(() => { closeCall(); onClose(); }, 1200);
  };

  if (!callLead) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        width: '100%', maxWidth: 500, background: 'var(--bg1)',
        border: '1px solid var(--bd2)', borderRadius: 6,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
      }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{callLead.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>
              {callLead.course} · {fmtSecs(callData.secs)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Required before returning</span>
            {/* Intentionally disabled close */}
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--bd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .25, cursor: 'not-allowed' }}>
              <svg width={8} height={8} viewBox="0 0 10 10" fill="none" stroke="var(--t3)" strokeWidth={1.5}>
                <line x1={1} y1={1} x2={9} y2={9}/><line x1={9} y1={1} x2={1} y2={9}/>
              </svg>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

          {/* Ghost lead nudge */}
          {isGhost && (
            <div style={{ background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 4,
              padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', fontWeight: 600, marginBottom: 4 }}>
                ⚠ Ghost Lead — 3 consecutive no-answers
              </div>
              <div style={{ fontSize: 11, color: 'var(--t1)', marginBottom: 8, lineHeight: 1.5 }}>
                {callLead.name} hasn't picked up 3 times in a row. What would you like to do?
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['Nurture','var(--purple)','var(--pbg)','var(--pdim)'],
                  ['Dead','var(--red)','var(--rbg)','var(--rdim)'],
                  ['ignore','var(--t2)','var(--bg3)','var(--bd)']].map(([act, col, bg, border]) => (
                  <button key={act} onClick={() => { setGhostAction(act); if (act !== 'ignore') setStatus(act); }}
                    style={{ flex: 1, height: 30, borderRadius: 3, border: `1px solid`,
                      fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer', transition: 'all .12s',
                      borderColor: ghostAction === act ? col : border,
                      background: ghostAction === act ? bg : 'none',
                      color: ghostAction === act ? col : 'var(--t2)',
                    }}>
                    {act === 'ignore' ? 'Keep & retry' : `Move to ${act}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="section-title">Call outcome</div>
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Connection status <span className="req">*</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {CONN_OPTS.map(o => (
                <button key={o.val} onClick={() => { setConn(o.val); if (o.val !== 'Connected') setRating(0); }}
                  style={{
                    padding: '8px 10px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                    textAlign: 'left', transition: 'all .12s',
                    borderColor: conn === o.val ? CONN_COLORS_MAP[o.val] : 'var(--bd)',
                    background: conn === o.val ? `${CONN_COLORS_MAP[o.val]}18` : 'none',
                  }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                    color: conn === o.val ? CONN_COLORS_MAP[o.val] : 'var(--t1)' }}>{o.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{o.sub}</div>
                </button>
              ))}
            </div>
            {attempted && !conn && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 4 }}>Select connection status</div>}
          </div>

          {/* Star rating (Connected only) */}
          {conn === 'Connected' && (
            <div style={{ marginBottom: 14 }}>
              <div className="field-label">Call rating <span className="req">*</span></div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                    style={{ fontSize: 24, cursor: 'pointer', color: (hover || rating) >= n ? 'var(--amber)' : 'var(--t3)', transition: 'all .1s' }}>
                    ★
                  </span>
                ))}
              </div>
              {attempted && conn === 'Connected' && rating === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 4 }}>Rate this call</div>}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />
          <div className="section-title">Next action</div>

          {/* Follow-up scheduler */}
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Follow-up date & time <span className="req">*</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" className="field-input" value={nextDate} min={todayStr()} onChange={e => setNextDate(e.target.value)} />
              <input type="time" className="field-input" value={nextTime} onChange={e => setNextTime(e.target.value)} />
            </div>
          </div>

          {/* Disposition */}
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Update lead status</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {STATUS_OPTS.map(o => (
                <button key={o.val} onClick={() => setStatus(o.val)} style={{
                  fontFamily: 'var(--mono)', fontSize: 9, padding: '4px 10px',
                  borderRadius: 3, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                  borderColor: status === o.val ? o.color : 'var(--bd)',
                  background: status === o.val ? `${o.color}18` : 'none',
                  color: status === o.val ? o.color : 'var(--t2)',
                }}>{o.val}</button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />
          <div className="section-title">Feedback</div>

          {/* Customer feedback */}
          {conn === 'Connected' && (
            <div style={{ marginBottom: 12 }}>
              <div className="field-label">Customer summary</div>
              <textarea className="field-textarea" rows={3}
                placeholder="What did they say? Interest level, concerns, commitments…"
                value={fbCustomer} onChange={e => setFbCustomer(e.target.value.slice(0, 300))} />
              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{fbCustomer.length}/300</div>
            </div>
          )}

          {/* Self note */}
          <div style={{ marginBottom: 12 }}>
            <div className="field-label">Self-improvement note</div>
            <textarea className="field-textarea" rows={2}
              placeholder="What could you do better next call?"
              value={fbSelf} onChange={e => setFbSelf(e.target.value.slice(0, 300))} />
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{fbSelf.length}/300</div>
          </div>

          {/* Recap */}
          <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />
          <div className="section-title">Call recap</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>Milestones</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {milestones.map(m => {
                const done = callData.checked.includes(m.label);
                return (
                  <span key={m.id} style={{
                    fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px', borderRadius: 2, border: '1px solid',
                    background: done ? 'var(--gbg)' : 'var(--bg3)',
                    color: done ? 'var(--green)' : 'var(--t2)',
                    borderColor: done ? 'var(--gdim)' : 'var(--bd)',
                  }}>{m.label}</span>
                );
              })}
            </div>
          </div>
          {callData.objTags.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>Objections tagged</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {callData.objTags.map(t => (
                  <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px', borderRadius: 2,
                    background: 'var(--abg)', color: 'var(--amber)', border: '1px solid var(--adim)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
          {attempted && !canSave
            ? <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', flex: 1 }}>Missing: {missing.join(', ')}</span>
            : <span style={{ flex: 1 }} />
          }
          <button
            className={`btn ${saved ? 'btn-ghost' : 'btn-green'}`}
            style={{ minWidth: 130 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'SAVE & CLOSE'}
          </button>
        </div>
      </div>
    </div>
  );
}
