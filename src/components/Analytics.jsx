import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { daysSince } from '../utils';

const OBJ_COLORS  = ['#f0930a','#a78bfa','#60a5fa','#22c55e','#ef4444'];
const SRC_COLORS  = { Enquiry: '#60a5fa', 'Cold Call': '#f0930a', Referral: '#22c55e' };
const CONN_COLORS = { Connected: '#22c55e', 'No Answer': '#5c6278', Busy: '#f0930a', Invalid: '#ef4444' };
const OBJ_TAGS    = ['Fees','Time','Unsure','Family','Competitor'];
const MILESTONES  = ['Greeted & verified interest','Course overview done','Salary discussed',
  'Placement stats shared','EMI / fee structure explained','Demo / trial offered',
  'Objection handled','Next step agreed upon'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 4, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10 }}>
      {label && <div style={{ color: 'var(--t2)', marginBottom: 4, fontSize: 9 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <span style={{ color: p.color || 'var(--t1)' }}>{p.name}</span>
          <span style={{ color: 'var(--t0)' }}>{p.value}{p.name?.includes('%') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 4, padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10 }}>
      <div style={{ color: 'var(--t0)' }}>{p.name}: {p.value}</div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }) {
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

function ChartCard({ title, sub, children, style }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 14, ...style }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', marginBottom: 2 }}>{title}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>{sub}</div>}
      {children}
    </div>
  );
}

function TrendNote({ children }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 8,
      paddingTop: 8, borderTop: '1px solid var(--bd)' }}>{children}</div>
  );
}

export default function Analytics() {
  const { leads, allLogs } = useAppStore();
  const [range, setRange] = useState('30d');

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (range === '7d' ? 7 : 30));
    return d;
  }, [range]);

  const logs = useMemo(() => allLogs.filter(l => new Date(l.timestamp) >= cutoff), [allLogs, cutoff]);

  // Summary
  const totalCalls   = logs.length;
  const connected    = logs.filter(l => l.connection_status === 'Connected');
  const connectRate  = totalCalls ? Math.round((connected.length / totalCalls) * 100) : 0;
  const ratings      = connected.filter(l => l.rating).map(l => l.rating);
  const avgRating    = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : '—';
  const hotLeads     = leads.filter(l => l.status === 'Hot').length;

  // Source matrix
  const sourceMatrix = useMemo(() => {
    return ['Enquiry','Cold Call','Referral'].map(src => {
      const srcLeads    = leads.filter(l => l.source === src);
      const srcLogs     = logs.filter(l => {
        const lead = leads.find(ld => ld.id === l.lead_id);
        return lead?.source === src;
      });
      const srcConn     = srcLogs.filter(l => l.connection_status === 'Connected');
      const srcEnrolled = srcLeads.filter(l => l.status === 'Enrolled').length;
      const srcRatings  = srcConn.filter(l => l.rating).map(l => l.rating);
      return {
        source:      src,
        leads:       srcLeads.length,
        connected:   srcConn.length,
        connectRate: srcLogs.length ? Math.round(srcConn.length / srcLogs.length * 100) : 0,
        enrolled:    srcEnrolled,
        closeRate:   srcLeads.length ? Math.round(srcEnrolled / srcLeads.length * 100) : 0,
        avgRating:   srcRatings.length ? (srcRatings.reduce((a,b) => a+b,0) / srcRatings.length).toFixed(1) : '—',
      };
    });
  }, [leads, logs]);

  // Objection frequency
  const objFreq = useMemo(() => {
    const counts = {};
    OBJ_TAGS.forEach(t => counts[t] = 0);
    logs.forEach(l => l.objection_tags?.forEach(t => { if (counts[t] !== undefined) counts[t]++; }));
    return OBJ_TAGS.map(t => ({ tag: t, count: counts[t] })).filter(o => o.count > 0);
  }, [logs]);

  const objTotal = objFreq.reduce((s, o) => s + o.count, 0);

  // Milestone gap
  const milestoneGap = useMemo(() => {
    const connLogs = logs.filter(l => l.connection_status === 'Connected');
    if (!connLogs.length) return MILESTONES.map(label => ({ label: label.split(' ').slice(0,2).join(' '), pct: 0 }));
    return MILESTONES.map(label => {
      const done = connLogs.filter(l => l.completed_milestones?.includes(label)).length;
      return { label: label.split(' ').slice(0, 2).join(' '), pct: Math.round(done / connLogs.length * 100) };
    });
  }, [logs]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    if (range === '7d') {
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      return days.map((day, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const dayLogs = allLogs.filter(l => {
          const ld = new Date(l.timestamp);
          return ld.toDateString() === d.toDateString();
        });
        return { day, calls: dayLogs.length, connected: dayLogs.filter(l => l.connection_status === 'Connected').length };
      });
    } else {
      return ['W1','W2','W3','W4'].map((week, i) => {
        const start = new Date(); start.setDate(start.getDate() - (27 - i*7));
        const end   = new Date(); end.setDate(end.getDate() - (21 - i*7));
        const wLogs = allLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d >= start && d < end;
        });
        return { day: week, calls: wLogs.length, connected: wLogs.filter(l => l.connection_status === 'Connected').length };
      });
    }
  }, [allLogs, range]);

  // Heatmap — last 28 days
  const heatmap = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (27 - i));
      const n = allLogs.filter(l => new Date(l.timestamp).toDateString() === d.toDateString()).length;
      return { n, day: d };
    });
  }, [allLogs]);

  const heatColor = n => {
    if (n === 0) return '#1e2128';
    if (n <= 2)  return '#1a2e0f';
    if (n <= 4)  return '#27500a';
    if (n <= 6)  return '#3b6d11';
    return '#22c55e';
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Range toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>Performance overview</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {[['7d','7 days'],['30d','30 days']].map(([k,l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 10px', borderRadius: 3,
              border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              borderColor: range === k ? 'var(--amber)' : 'var(--bd)',
              background: range === k ? 'var(--abg)' : 'none',
              color: range === k ? 'var(--amber)' : 'var(--t2)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <SummaryCard label="Total Calls"    value={totalCalls}         sub="Logged this period"           accent="var(--amber)" />
        <SummaryCard label="Connect Rate"   value={`${connectRate}%`}  sub={`${connected.length} answered`} accent="var(--green)" />
        <SummaryCard label="Avg Rating"     value={avgRating}          sub="Out of 5 stars"               accent="var(--blue)" />
        <SummaryCard label="Hot Leads"      value={hotLeads}           sub="Active pipeline"              accent="var(--purple)" />
      </div>

      {/* Source matrix */}
      <ChartCard title="Source conversion matrix" sub="Connect rate & close rate by lead source">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {['Source','Leads','Connected','Connect %','Enrolled','Close %','Avg ★'].map(h => (
                <th key={h} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)',
                  textTransform: 'uppercase', padding: '5px 8px', borderBottom: '1px solid var(--bd)',
                  textAlign: h === 'Source' ? 'left' : 'right', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sourceMatrix.map(row => (
              <tr key={row.source}>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--bd)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SRC_COLORS[row.source], flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.source}</span>
                  </div>
                </td>
                {[row.leads, row.connected].map((v,i) => (
                  <td key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                    borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--t1)' }}>{v}</td>
                ))}
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                  borderBottom: '1px solid var(--bd)', textAlign: 'right',
                  color: row.connectRate >= 70 ? 'var(--green)' : row.connectRate >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                  {row.connectRate}%
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                  borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--t1)' }}>{row.enrolled}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                  borderBottom: '1px solid var(--bd)', textAlign: 'right',
                  color: row.closeRate >= 25 ? 'var(--green)' : row.closeRate >= 10 ? 'var(--amber)' : 'var(--red)' }}>
                  {row.closeRate}%
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '8px 8px',
                  borderBottom: '1px solid var(--bd)', textAlign: 'right', color: 'var(--amber)' }}>
                  {row.avgRating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TrendNote>Referral leads close 4× better than Cold Calls — prioritise referral asks post-enrollment.</TrendNote>
      </ChartCard>

      {/* Objection + Milestone row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Objection pie */}
        <ChartCard title="Objection frequency" sub="Most-tagged objections on connected calls">
          {objFreq.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', padding: '20px 0', textAlign: 'center' }}>No data yet</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {objFreq.map((o,i) => (
                  <div key={o.tag} style={{ display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: OBJ_COLORS[i], flexShrink: 0 }} />
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
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {objFreq[0] && <TrendNote>"{objFreq[0].tag}" dominates ({Math.round(objFreq[0].count/objTotal*100)}%) — lead with EMI offer earlier.</TrendNote>}
            </>
          )}
        </ChartCard>

        {/* Milestone gap bar */}
        <ChartCard title="Milestone completion gap" sub="% of connected calls where each step was done">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={milestoneGap} margin={{ top: 4, right: 4, left: -20, bottom: 36 }}>
              <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 8 }}
                angle={-35} textAnchor="end" interval={0} axisLine={{ stroke: 'var(--bd)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }}
                axisLine={false} tickLine={false} tickFormatter={v => v+'%'} domain={[0,100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <ReferenceLine y={50} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1} />
              <Bar dataKey="pct" name="Completion %" radius={[2,2,0,0]}>
                {milestoneGap.map((d,i) => (
                  <Cell key={i} fill={d.pct>=70?'var(--green)':d.pct>=45?'var(--amber)':'var(--red)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <TrendNote>Drop-off after "Placement stats" — reinforce demo offer before wrapping up.</TrendNote>
        </ChartCard>
      </div>

      {/* Volume + Heatmap row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Weekly volume */}
        <ChartCard title={range === '7d' ? 'Daily call volume — this week' : 'Weekly call volume — this month'}
          sub="Total calls vs connected">
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            {[['var(--bd2)','Total'],['var(--green)','Connected']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }}
                axisLine={{ stroke: 'var(--bd)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--t2)', fontFamily: 'var(--mono)', fontSize: 9 }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
              <Bar dataKey="calls"     name="Total"     fill="var(--bd2)"  radius={[2,2,0,0]} />
              <Bar dataKey="connected" name="Connected" fill="var(--green)" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Heatmap */}
        <ChartCard title="Call activity heatmap — last 28 days" sub="Daily call count intensity">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {heatmap.map((c,i) => (
              <div key={i} title={`${c.n} calls — ${c.day.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}`}
                style={{ aspectRatio: 1, borderRadius: 2, background: heatColor(c.n), cursor: 'default' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Less</span>
            {['#1e2128','#1a2e0f','#27500a','#3b6d11','#22c55e'].map((c,i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 1, background: c }} />
            ))}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>More</span>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
