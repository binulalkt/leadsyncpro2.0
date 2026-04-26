import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { importLeadsFromCSV } from '../db';
import { useAppStore } from '../store';

const EXPECTED_COLS = ['name','phone','email','course','source','status'];

export default function CSVImport({ onClose, onImported }) {
  const { addLeadToStore } = useAppStore();
  const [step,     setStep]     = useState('upload');  // upload | preview | done
  const [rows,     setRows]     = useState([]);
  const [error,    setError]    = useState('');
  const [importing,setImporting]= useState(false);
  const [count,    setCount]    = useState(0);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const cols = meta.fields?.map(f => f.toLowerCase().trim()) || [];
        if (!cols.includes('name') || !cols.includes('phone')) {
          setError('CSV must have at least "name" and "phone" columns.');
          return;
        }
        // normalise keys to lowercase
        const normalised = data.map(row => {
          const r = {};
          Object.keys(row).forEach(k => { r[k.toLowerCase().trim()] = row[k]; });
          return r;
        }).filter(r => r.name?.trim() && r.phone?.trim());
        if (!normalised.length) { setError('No valid rows found (need name + phone).'); return; }
        setRows(normalised.slice(0, 500)); // hard cap
        setStep('preview');
      },
      error: e => setError(e.message),
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const ids = await importLeadsFromCSV(rows);
      // Add to Zustand store
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      rows.forEach((r, i) => {
        addLeadToStore({
          ...r, id: ids[i],
          last_called_at: new Date(0),
          next_follow_up_at: tomorrow,
          source: ['Enquiry','Cold Call','Referral'].includes(r.source) ? r.source : 'Cold Call',
          status: ['New','Hot','Nurture','Enrolled','Dead'].includes(r.status) ? r.status : 'New',
        });
      });
      setCount(ids.length);
      setStep('done');
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const s = (k) => ({
    width: '100%', height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
    borderRadius: 4, padding: '0 8px', fontFamily: 'var(--mono)', fontSize: 11,
    color: 'var(--t0)', outline: 'none',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg1)',
        border: '1px solid var(--bd2)', borderRadius: 6, overflow: 'hidden',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>Import Leads from CSV</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
              Required columns: name, phone — Optional: email, course, source, status
            </div>
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 4, background: 'none',
            border: '1px solid var(--bd)', color: 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <line x1={1} y1={1} x2={9} y2={9}/><line x1={9} y1={1} x2={1} y2={9}/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {step === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--amber)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--bd)'; handleFile(e.dataTransfer.files[0]); }}
                style={{ border: '2px dashed var(--bd)', borderRadius: 6, padding: '32px 20px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s', marginBottom: 16 }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth={1.5}
                  style={{ margin: '0 auto 10px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1={12} y1={3} x2={12} y2={15}/>
                </svg>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', marginBottom: 4 }}>
                  Click to choose CSV or drag & drop
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
                  Max 500 rows per import
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />

              {/* Sample format */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Expected CSV format
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', lineHeight: 1.8 }}>
                  name,phone,email,course,source,status<br/>
                  Priya Kumar,+91 98765 43210,,Data Science,Enquiry,New<br/>
                  Rahul Nair,+91 87654 32109,r@gmail.com,MERN Stack,Cold Call,Hot
                </div>
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
            </>
          )}

          {step === 'preview' && (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', marginBottom: 12 }}>
                {rows.length} valid rows found — review before importing:
              </div>
              <div style={{ border: '1px solid var(--bd)', borderRadius: 4, overflow: 'auto', maxHeight: 280 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Name','Phone','Course','Source','Status'].map(h => (
                        <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)',
                          padding: '5px 8px', borderBottom: '1px solid var(--bd)',
                          background: 'var(--bg2)', textAlign: 'left', fontWeight: 400, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--mono)', fontSize: 10 }}>{r.name}</td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)' }}>{r.phone}</td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{r.course || '—'}</td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--mono)', fontSize: 10,
                          color: r.source === 'Enquiry' ? 'var(--blue)' : r.source === 'Referral' ? 'var(--green)' : 'var(--amber)' }}>
                          {r.source || 'Cold Call'}
                        </td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)' }}>{r.status || 'New'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div style={{ padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)',
                    borderTop: '1px solid var(--bd)', background: 'var(--bg2)' }}>
                    +{rows.length - 20} more rows not shown
                  </div>
                )}
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', marginBottom: 6 }}>
                {count} leads imported
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>
                All saved to IndexedDB — available offline
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', background: 'var(--bg2)',
          display: 'flex', gap: 8, flexShrink: 0 }}>
          {step === 'upload' && <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>}
          {step === 'preview' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>Back</button>
              <button className="btn btn-green" style={{ flex: 1 }} onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : `Import ${rows.length} leads`}
              </button>
            </>
          )}
          {step === 'done' && <button className="btn btn-green" style={{ flex: 1 }} onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
