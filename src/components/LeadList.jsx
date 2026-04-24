import { useMemo } from 'react';
import { useAppStore } from '../store';
import { STATUS_COLORS, SOURCE_COLORS, initials, avatarPalette, fmtDate, isStale, sortLeads, daysUntil } from '../utils';

const STATUSES = ['New','Hot','Nurture','Enrolled','Dead'];
const SOURCES  = ['Enquiry','Cold Call','Referral'];
const SORTS    = [['priority','Inbound First'],['followup','Follow-up'],['recent','Recent'],['stale','Stale']];

function SourcePill({ src }) {
  const cls = src === 'Enquiry' ? 'pill-enquiry' : src === 'Cold Call' ? 'pill-coldcall' : 'pill-referral';
  return <span className={`pill ${cls}`}>{src}</span>;
}

function LeadRow({ lead, selected, onSelect, onDial, decayDays }) {
  const stale  = isStale(lead, decayDays);
  const pal    = avatarPalette(lead.id);
  const isPrio = lead.source === 'Enquiry';

  return (
    <div
      onClick={() => onSelect(lead)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
        transition: 'background .1s',
        background: selected ? 'var(--bg3)' : 'none',
        border: `1px solid ${selected ? 'var(--bd2)' : 'transparent'}`,
        borderLeft: isPrio ? `2px solid ${selected ? 'var(--amber)' : 'var(--bdim)'}` : undefined,
        marginBottom: 2,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: pal.bg, color: pal.color,
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${pal.color}33`,
      }}>{initials(lead.name)}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</span>
          {stale && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--red)',
              background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 2, padding: '1px 4px', flexShrink: 0 }}>
              STALE
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {lead.course}
        </div>
      </div>

      {/* Right badges */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <SourcePill src={lead.source} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: STATUS_COLORS[lead.status] }}>
          {lead.status}
        </span>
      </div>
    </div>
  );
}

export default function LeadList({ onDial }) {
  const {
    leads, selectedLead, setSelectedLead,
    search, setSearch,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    sortMode, setSortMode,
    settings,
  } = useAppStore();

  const decayDays = settings?.decay_days ?? 7;

  const filtered = useMemo(() => {
    let list = [...leads];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.replace(/\s/g,'').includes(q.replace(/\s/g,''))
      );
    }
    if (statusFilter) list = list.filter(l => l.status === statusFilter);
    if (sourceFilter) list = list.filter(l => l.source === sourceFilter);
    return sortLeads(list, sortMode);
  }, [leads, search, statusFilter, sourceFilter, sortMode]);

  const enquiryCount = filtered.filter(l => l.source === 'Enquiry').length;

  return (
    <div style={{ width: 330, flexShrink: 0, borderRight: '1px solid var(--bd)',
      display: 'flex', flexDirection: 'column', background: 'var(--bg0)' }}>

      {/* Toolbar */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bd)',
        background: 'var(--bg1)', flexShrink: 0 }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            width: 12, height: 12, stroke: 'var(--t2)', fill: 'none' }} viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="field-input"
            style={{ paddingLeft: 28, height: 30 }}
            placeholder="Search name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 5 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px',
              borderRadius: 3, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              background: statusFilter === s ? 'var(--bg3)' : 'none',
              borderColor: statusFilter === s ? STATUS_COLORS[s] : 'var(--bd)',
              color: statusFilter === s ? STATUS_COLORS[s] : 'var(--t2)',
            }}>{s}</button>
          ))}
        </div>

        {/* Source chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {SOURCES.map(s => (
            <button key={s} onClick={() => setSourceFilter(s)} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px',
              borderRadius: 3, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              background: sourceFilter === s ? 'var(--bg3)' : 'none',
              borderColor: sourceFilter === s ? SOURCE_COLORS[s] : 'var(--bd)',
              color: sourceFilter === s ? SOURCE_COLORS[s] : 'var(--t2)',
            }}>{s}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase' }}>Sort:</span>
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => setSortMode(k)} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px',
              borderRadius: 3, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
              background: sortMode === k ? 'var(--abg)' : 'none',
              borderColor: sortMode === k ? 'var(--adim)' : 'var(--bd)',
              color: sortMode === k ? 'var(--amber)' : 'var(--t2)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Count bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', borderBottom: '1px solid var(--bd)', background: 'var(--bg1)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
          {filtered.length} leads
        </span>
        {enquiryCount > 0 && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)',
            background: 'var(--bbg)', border: '1px solid var(--bdim)', borderRadius: 3, padding: '1px 6px' }}>
            {enquiryCount} inbound
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
            No leads match filters
          </div>
        ) : (
          filtered.map(l => (
            <LeadRow
              key={l.id}
              lead={l}
              selected={selectedLead?.id === l.id}
              onSelect={setSelectedLead}
              onDial={onDial}
              decayDays={decayDays}
            />
          ))
        )}
      </div>
    </div>
  );
}
