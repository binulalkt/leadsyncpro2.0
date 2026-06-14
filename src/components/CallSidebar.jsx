import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { OBJ_TAGS } from '../db';
import { initials, avatarPalette, fmtSecs } from '../utils';

function CueAccordion({ cue }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, marginBottom: 4, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 10px', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t0)' }}>{cue.title}</span>
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="var(--t2)" strokeWidth={1.5}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <polyline points="1,3 5,7 9,3"/>
        </svg>
      </div>
      {open && (
        <div style={{ padding: '6px 10px 10px', borderTop: '1px solid var(--bd)' }}>
          {(cue.points || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, padding: '3px 0', fontSize: 11, color: 'var(--t1)', lineHeight: 1.4 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)', marginTop: 6, flexShrink: 0 }} />
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CallSidebar({ onEndCall }) {
  const {
    callLead, callSeconds, callRunning, callChecked, callObjTags,
    milestones, pitchCues, startTimer, pauseTimer, resetTimer,
    toggleMilestone, toggleObjTag,
  } = useAppStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasStarted = useRef(false);
  useEffect(() => { hasStarted.current = false; }, [callLead?.id]);

  const handleStart = () => { hasStarted.current = true; startTimer(); };

  if (!callLead) return null;
  const pal       = avatarPalette(callLead.id);
  const doneCount = callChecked.length;
  const pct       = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  return (
    <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, background: 'var(--bg1)',
      borderLeft: isMobile ? 'none' : '1px solid var(--bd)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header + timer */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: pal.bg, color: pal.color, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${pal.color}44` }}>
            {initials(callLead.name)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{callLead.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{callLead.phone}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, flex: 1,
            color: callRunning ? 'var(--amber)' : callSeconds > 0 ? 'var(--t1)' : 'var(--t3)' }}>
            {fmtSecs(callSeconds)}
          </span>
          {!callRunning
            ? <button className="btn btn-green" style={{ height: 28, padding: '0 10px', fontSize: 9 }} onClick={handleStart}>
                {callSeconds === 0 ? 'Start' : 'Resume'}
              </button>
            : <button className="btn btn-amber" style={{ height: 28, padding: '0 10px', fontSize: 9 }} onClick={pauseTimer}>Pause</button>
          }
          {callSeconds > 0 && (
            <button className="btn btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 9 }}
              onClick={() => { resetTimer(); hasStarted.current = false; }}>Reset</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* Milestones */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Milestone checklist</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 2, transition: 'width .2s' }} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{doneCount}/{milestones.length}</span>
          </div>
          {milestones.map(m => {
            const done = callChecked.includes(m.label);
            return (
              <div key={m.id} onClick={() => toggleMilestone(m.label)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px',
                  borderRadius: 3, cursor: 'pointer', marginBottom: 2, opacity: done ? .6 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: '1px solid',
                  borderColor: done ? 'var(--green)' : 'var(--bd2)', background: done ? 'var(--gdim)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                  {done && <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="var(--green)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                </div>
                <span style={{ fontSize: 11, color: done ? 'var(--t2)' : 'var(--t0)', textDecoration: done ? 'line-through' : 'none' }}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Objection tags */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Objection tags</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {OBJ_TAGS.map(tag => {
              const active = callObjTags.includes(tag);
              return (
                <button key={tag} onClick={() => toggleObjTag(tag)} style={{
                  padding: '6px 8px', borderRadius: 3, border: '1px solid', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center', transition: 'all .12s',
                  background: active ? 'var(--abg)' : 'none',
                  borderColor: active ? 'var(--adim)' : 'var(--bd)',
                  color: active ? 'var(--amber)' : 'var(--t1)',
                }}>{tag}</button>
              );
            })}
          </div>
          {callObjTags.length > 0 && (
            <div style={{ marginTop: 5, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)' }}>
              Tagged: {callObjTags.join(', ')}
            </div>
          )}
        </div>

        {/* Pitch cues — from DB (editable) */}
        <div>
          <div className="section-title">Pitch cue card</div>
          {pitchCues.map((cue, i) => <CueAccordion key={cue.id ?? i} cue={cue} />)}
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bd)', flexShrink: 0 }}>
        <button className="btn btn-red" style={{ width: '100%', height: 38, fontSize: 11 }}
          disabled={!hasStarted.current && callSeconds === 0}
          onClick={() => onEndCall({ secs: callSeconds, checked: callChecked, objTags: callObjTags })}>
          END CALL — SUBMIT FEEDBACK
        </button>
      </div>
    </div>
  );
}
