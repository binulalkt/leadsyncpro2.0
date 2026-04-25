import { useState, useRef, useEffect } from 'react';

const COURSES = [
  'Data Science','MERN Stack','Flutter Dev','UI/UX Design',
  'Digital Marketing','Ethical Hacking','Python Full Stack','Cloud Computing',
  'Machine Learning','React Native','DevOps','Java Full Stack',
];
const STATUSES = ['New','Hot','Nurture','Enrolled','Dead'];

const SOURCE_OPTS = [
  { val: 'Enquiry',   label: 'Enquiry',   sub: 'Inbound interest', col: 'var(--blue)',   bg: 'var(--bbg)', bd: 'var(--bdim)' },
  { val: 'Cold Call', label: 'Cold Call', sub: 'Outbound dial',    col: 'var(--amber)',  bg: 'var(--abg)', bd: 'var(--adim)' },
  { val: 'Referral',  label: 'Referral',  sub: 'From existing',   col: 'var(--green)',  bg: 'var(--gbg)', bd: 'var(--gdim)' },
];

function todayPlus(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const EMPTY = { name: '', phone: '', email: '', course: '', source: '', status: 'New', followup: todayPlus(1) };

function validate(f) {
  const e = {};
  if (!f.name.trim())  e.name   = 'Name is required';
  if (!f.phone.trim()) e.phone  = 'Phone is required';
  else if (!/^[+\d\s\-()]{7,15}$/.test(f.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid phone number';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email';
  if (!f.source)  e.source = 'Select a source';
  if (!f.course)  e.course = 'Select a course';
  return e;
}

export default function AddLeadDrawer({ open, onClose, onSave }) {
  const [form,      setForm]      = useState(EMPTY);
  const [errors,    setErrors]    = useState({});
  const [attempted, setAttempted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const nameRef = useRef();

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 100);
  }, [open]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setAttempted(true);
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        last_called_at:    new Date(0),               // never called
        next_follow_up_at: form.followup ? new Date(form.followup + 'T09:00') : new Date(),
      });
      setForm(EMPTY); setErrors({}); setAttempted(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY); setErrors({}); setAttempted(false);
    onClose();
  };

  const inputStyle = (key) => ({
    width: '100%', height: 34, background: 'var(--bg2)',
    border: `1px solid ${attempted && errors[key] ? 'var(--rdim)' : 'var(--bd)'}`,
    borderRadius: 4, padding: '0 10px',
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t0)',
    outline: 'none', transition: 'border-color .12s',
  });

  const selectStyle = (key) => ({
    ...inputStyle(key),
    appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpolyline points='0,1 5,5 10,1' fill='none' stroke='%235c6278' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    backgroundColor: 'var(--bg2)',
  });

  return (
    <>
      {/* Overlay */}
      {open && (
        <div onClick={handleClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300,
        }} />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: 'var(--bg1)', borderLeft: '1px solid var(--bd2)',
        display: 'flex', flexDirection: 'column', zIndex: 301,
        boxShadow: '-8px 0 32px rgba(0,0,0,.5)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .22s cubic-bezier(.25,.46,.45,.94)',
      }}>

        {/* Header */}
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--bd)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>Add New Lead</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
              Saved to IndexedDB — works offline
            </div>
          </div>
          <button onClick={handleClose} style={{
            width: 26, height: 26, borderRadius: 4, background: 'none',
            border: '1px solid var(--bd)', color: 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <line x1={1} y1={1} x2={9} y2={9}/><line x1={9} y1={1} x2={1} y2={9}/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* Name + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div className="field-label">Name <span className="req">*</span></div>
              <input ref={nameRef} style={inputStyle('name')} placeholder="Full name"
                value={form.name} onChange={set('name')} />
              {attempted && errors.name && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 3 }}>{errors.name}</div>}
            </div>
            <div>
              <div className="field-label">Phone <span className="req">*</span></div>
              <input style={inputStyle('phone')} placeholder="+91 98765 43210"
                value={form.phone} onChange={set('phone')} />
              {attempted && errors.phone && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 3 }}>{errors.phone}</div>}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Email <span style={{ color: 'var(--t3)' }}>(optional)</span></div>
            <input style={inputStyle('email')} placeholder="name@gmail.com" type="email"
              value={form.email} onChange={set('email')} />
            {attempted && errors.email && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 3 }}>{errors.email}</div>}
          </div>

          {/* Course */}
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Course <span className="req">*</span></div>
            <select style={selectStyle('course')} value={form.course} onChange={set('course')}>
              <option value="">Select course…</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {attempted && errors.course && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 3 }}>{errors.course}</div>}
          </div>

          {/* Source */}
          <div style={{ marginBottom: 14 }}>
            <div className="field-label">Source <span className="req">*</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {SOURCE_OPTS.map(s => (
                <button key={s.val} onClick={() => setForm(p => ({ ...p, source: s.val }))} style={{
                  padding: '8px 6px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                  textAlign: 'center', transition: 'all .12s', background: 'none',
                  borderColor: form.source === s.val ? s.col : 'var(--bd)',
                  backgroundColor: form.source === s.val ? s.bg : 'transparent',
                }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                    color: form.source === s.val ? s.col : 'var(--t1)' }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--t2)', marginTop: 2 }}>{s.sub}</div>
                </button>
              ))}
            </div>
            {attempted && errors.source && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', marginTop: 3 }}>{errors.source}</div>}
          </div>

          <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />

          {/* Status + Follow-up */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div className="field-label">Initial status</div>
              <select style={selectStyle()} value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="field-label">First follow-up</div>
              <input type="date" style={{ ...inputStyle(), colorScheme: 'dark' }}
                value={form.followup} min={new Date().toISOString().slice(0,10)}
                onChange={set('followup')} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)',
          background: 'var(--bg2)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-green" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  style={{ animation: 'spin .7s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/>
                </svg>
                ADD LEAD
              </>
            )}
          </button>
          <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
