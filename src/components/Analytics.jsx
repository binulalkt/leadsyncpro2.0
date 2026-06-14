import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';

const OBJ_COLORS = ['#f0930a','#a78bfa','#60a5fa','#22c55e','#ef4444'];
const SRC_COLORS = { Enquiry: '#60a5fa', 'Cold Call': '#f0930a', Referral: '#22c55e' };
const CONN_COLORS = { Connected: '#22c55e', 'No Answer': '#5c6278', Busy: '#f0930a', Invalid: '#ef4444' };
const OBJ_TAGS   = ['Fees','Time','Unsure','Family','Competitor'];
const MILESTONES = ['Greeted & verified interest','Course overview done','Salary discussed',
  'Placement stats shared','EMI / fee structure explained','Demo / trial offered',
  'Objection handled','Next step agreed upon'];

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 4,
      padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10 }}>
      {label && <div style={{ color: 'var(--t2)', marginBottom: 3, fontSize: 9 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <span style={{ color: p.color || 'var(--t1)' }}>{p.name}</span>
          <span style={{ color: 'var(--t0)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 4, padding: '7px 11px', fontFamily: 'var(--mono)', fontSize: 10 }}>
      {payload[0].name}: {payload[0].value}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5,
      padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
        background: accent, borderRadius: '3px 0 0 3px' }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--t0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Card({ title, sub, children, style }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 14, ...style }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', marginBottom: 2 }}>{title}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>{sub}</div>}
      {children}
    </div>
  );
}

function EmptyChart({ msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 140, gap: 8 }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1.2}>
        <line x1={18} y1={20} x2={18} y2={10}/><line x1={12} y1={20} x2={12} y2={4}/>
        <line x1={6} y1={20} x2={6} y2={14}/></svg>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', textAlign: 'center' }}>{msg}</div>
    </div>
  );
}

function Note({ children }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 8,
    paddingTop: 8, borderTop: '1px solid var(--bd)' }}>{children}</div>;
}

export default function Analytics() {
  const { leads, allLogs } = useAppStore();
  const [range, setRange] = useState('30d');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - (range === '7d' ? 7 : 30)); return d;
  }, [range]);

  const logs = useMemo(() => allLogs.filter(l => new Date(l.timestamp) >= cutoff), [allLogs, cutoff]);
  const connected = logs.filter(l => l.connection_status === 'Connected');
  const totalCalls = logs.length;
  const connectRate = totalCalls ? Math.round(connected.length / totalCalls * 100) : 0;
  const ratings = connected.filter(l => l.rating).map(l => l.rating);
  const avgRating = ratings.length ? (ratings.reduce((a,b) => a+b,0) / ratings.length).toFixed(1) : '—';
  const hotLeads = leads.filter(l => l.status === 'Hot').length;

  const sourceMatrix = useMemo(() => ['Enquiry','Cold Call','Referral'].map(src => {
    const sl = leads.filter(l => l.source === src);
    const sLogs = logs.filter(l => leads.find(ld => ld.id === l.lead_id)?.source === src);
    const sConn = sLogs.filter(l => l.connection_status === 'Connected');
    const sEnrolled = sl.filter(l => l.status === 'Enrolled').length;
    const sRatings = sConn.filter(l => l.rating).map(l => l.rating);
    return {
      source: src, leads: sl.length, connected: sConn.length,
      connectRate: sLogs.length ? Math.round(sConn.length / sLogs.length * 100) : 0,
      enrolled: sEnrolled,
      closeRate: sl.length ? Math.round(sEnrolled / sl.length * 100) : 0,
      avgRating: sRatings.length ? (sRatings.reduce((a,b)=>a+b,0)/sRatings.length).toFixed(1) : '—',
    };
  }), [leads, logs]);

  const objFreq = useMemo(() => {
    const c = {}; OBJ_TAGS.forEach(t => c[t] = 0);
    logs.forEach(l => l.objection_tags?.forEach(t => { if (c[t] !== undefined) c[t]++; }));
    return OBJ_TAGS.map(t => ({ tag: t, count: c[t] })).filter(o => o.count > 0);
  }, [logs]);
  const objTotal = objFreq.reduce((s,o) => s+o.count, 0);

  const milestoneGap = useMemo(() => {
    const cl = connected;
    return MILESTONES.map(label => ({
      label: label.split(' ').slice(0,2).join(' '),
      pct: cl.length ? Math.round(cl.filter(l => l.completed_milestones?.includes(label)).length / cl.length * 100) : 0,
    }));
  }, [connected]);

  const weeklyTrend = useMemo(() => {
    if (range === '7d') {
      return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6-i));
        const dl = allLogs.filter(l => new Date(l.timestamp).toDateString() === d.toDateString());
        return { day, calls: dl.length, connected: dl.filter(l => l.connection_status === 'Connected').length };
      });
    }
    return ['W1','W2','W3','W4'].map((week, i) => {
      const s = new Date(); s.setDate(s.getDate() - (27-i*7));
      const e = new Date(); e.setDate(e.getDate() - (20-i*7));
      const wl = allLogs.filter(l => { const d = new Date(l.timestamp); return d >= s && d < e; });
      return { day: week, calls: wl.length, connected: wl.filter(l => l.connection_status === 'Connected').length };
    });
  }, [allLogs, range]);

  const heatmap = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (27-i));
    return { n: allLogs.filter(l => new Date(l.timestamp).toDateString() === d.toDateString()).length, d };
  }), [allLogs]);

  const heatC = n => n === 0 ? '#1e2128' : n <= 2 ? '#1a2e0f' : n <= 4 ? '#27500a' : n <= 6 ? '#3b6d11' : '#22c55e';
  const hasData = totalCalls > 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>Performance overview</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {[['7d','7 days'],['30d','30 days']].map(([k,l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 10px', borderRadius: 3,
              border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              borderColor: range===k?'var(--amber)':'var(--bd)',
              background: range===k?'var(--abg)':'none',
              color: range===k?'var(--amber)':'var(--t2)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
        <StatCard label="Total Calls"  value={totalCalls}        sub="Logged this period"       accent="var(--amber)" />
        <StatCard label="Connect Rate" value={`${connectRate}%`} sub={`${connected.length} answered`} accent="var(--green)" />
        <StatCard label="Avg Rating"   value={avgRating}         sub="Out of 5 stars"           accent="var(--blue)" />
        <StatCard label="Hot Leads"    value={hotLeads}          sub="Active pipeline"          accent="var(--purple)" />
      </div>

      {!hasData && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 5,
          padding: '24px 20px', textAlign: 'center' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth={1.2}
            style={{ margin: '0 auto 10px', display: 'block' }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/>
            <path d="M1 1l22 22"/></svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>No call data yet</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
            Add leads, start dialing, and submit post-call forms — charts will populate automatically.
          </div>
        </div>
      )}

      {/* Source matrix */}
      <Card title="Source conversion matrix" sub="Connect rate & close rate by lead source">
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: isMobile ? 550 : '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>{['Source','Leads','Connected','Connect %','Enrolled','Close %','Avg ★'].map(h => (
              <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)',
                textTransform: 'uppercase', padding: '5px 8px', borderBottom: '1px solid var(--bd)',
                textAlign: h === 'Source' ? 'left' : 'right', fontWeight: 400 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {sourceMatrix.map(row => (
              <tr key={row.source}>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--bd)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SRC_COLORS[row.source] }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.source}</span>
                  </div>
                </td>
                {[row.leads, row.connected].map((v,i) => (
                  <td key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                    borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--t1)' }}>{v}</td>
                ))}
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'right',
                  color: row.connectRate>=70?'var(--green)':row.connectRate>=50?'var(--amber)':'var(--red)' }}>
                  {row.connectRate}%
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--t1)' }}>{row.enrolled}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'right',
                  color: row.closeRate>=25?'var(--green)':row.closeRate>=10?'var(--amber)':'var(--red)' }}>
                  {row.closeRate}%
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px', borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--amber)' }}>{row.avgRating}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {leads.length > 0 && <Note>Referral leads close at higher rates — ask enrolled students for referrals.</Note>}
      </Card>

      {/* Obj + Milestone */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Card title="Objection frequency" sub="Most-tagged objections on connected calls">
          {objFreq.length === 0
            ? <EmptyChart msg="No objections tagged yet — start logging calls" />
            : <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {objFreq.map((o,i) => (
                    <div key={o.tag} style={{ display: 'flex', alignItems: 'center', gap: 4,
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: OBJ_COLORS[i] }} />
                      {o.tag} ({objTotal ? Math.round(o.count/objTotal*100) : 0}%)
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={objFreq} dataKey="count" nameKey="tag" cx="50%" cy="50%"
                      innerRadius={40} outerRadius={70} paddingAngle={3} stroke="none">
                      {objFreq.map((o,i) => <Cell key={o.tag} fill={OBJ_COLORS[i]} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <Note>"{objFreq[0]?.tag}" is the top objection — address it earlier in the pitch.</Note>
              </>
          }
        </Card>

        <Card title="Milestone completion gap" sub="% of connected calls where each step was done">
          {!hasData
            ? <EmptyChart msg="No call data yet — milestones will appear after logging calls" />
            : <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={milestoneGap} margin={{ top: 4, right: 4, left: -20, bottom: 36 }}>
                    <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 8 }}
                      angle={-35} textAnchor="end" interval={0} axisLine={{ stroke: 'var(--bd)' }} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }}
                      axisLine={false} tickLine={false} tickFormatter={v=>v+'%'} domain={[0,100]} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <ReferenceLine y={50} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1} />
                    <Bar dataKey="pct" name="Completion %" radius={[2,2,0,0]}>
                      {milestoneGap.map((d,i) => <Cell key={i} fill={d.pct>=70?'var(--green)':d.pct>=45?'var(--amber)':'var(--red)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Note>Steps below 50% (dashed line) need attention in your call structure.</Note>
              </>
          }
        </Card>
      </div>

      {/* Volume + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Card title={range==='7d'?'Daily call volume — this week':'Weekly call volume — this month'}
          sub="Total calls vs connected">
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            {[['var(--bd2)','Total'],['var(--green)','Connected']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>
          {!hasData
            ? <EmptyChart msg="Log your first call to see volume trends" />
            : <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }}
                    axisLine={{ stroke: 'var(--bd)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="calls"     name="Total"     fill="var(--bd2)"   radius={[2,2,0,0]} />
                  <Bar dataKey="connected" name="Connected" fill="var(--green)"  radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card title="Call activity heatmap — last 28 days" sub="Daily call count intensity">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {heatmap.map((c,i) => (
              <div key={i} title={`${c.n} calls`}
                style={{ aspectRatio: 1, borderRadius: 2, background: heatC(c.n) }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Less</span>
            {['#1e2128','#1a2e0f','#27500a','#3b6d11','#22c55e'].map((c,i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 1, background: c }} />
            ))}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>More</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
