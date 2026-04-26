import { useEffect, useState } from 'react';
import './index.css';
import { seedDatabase, getLeads, getMilestones, getSettings, getAllCallLogs, getCallLogs, addLead, getPitchCues } from './db';
import { useAppStore } from './store';
import Topbar from './components/Topbar';
import LeadList from './components/LeadList';
import LeadDetail from './components/LeadDetail';
import CallSidebar from './components/CallSidebar';
import PostCallModal from './components/PostCallModal';
import Analytics from './components/Analytics';
import AddLeadDrawer from './components/AddLeadDrawer';
import TodayView from './components/TodayView';
import CSVImport from './components/CSVImport';

export default function App() {
  const {
    page, setPage, setLeads, setMilestones, setSettings, setAllLogs,
    setPitchCues, callActive, startCall, openModal, modalOpen,
    callLogsCache, setLeadLogs, addLeadToStore,
  } = useAppStore();

  const [loading,     setLoading]     = useState(true);
  const [callData,    setCallData]    = useState(null);
  const [consecNA,    setConsecNA]    = useState(0);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [csvOpen,     setCsvOpen]     = useState(false);
  const [addFlash,    setAddFlash]    = useState(null);

  useEffect(() => {
    (async () => {
      await seedDatabase();
      const [leads, milestones, settings, allLogs, pitchCues] = await Promise.all([
        getLeads(), getMilestones(), getSettings(), getAllCallLogs(), getPitchCues(),
      ]);
      setLeads(leads);
      setMilestones(milestones);
      setPitchCues(pitchCues);
      if (settings) setSettings(settings);
      setAllLogs(allLogs);
      setLoading(false);
    })();
  }, []);

  const handleDial = (lead) => {
    window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
    startCall(lead);
    if (!callLogsCache[lead.id]) {
      getCallLogs(lead.id).then(logs => setLeadLogs(lead.id, logs));
    }
  };

  const handleEndCall = (data) => {
    const lead = useAppStore.getState().callLead;
    if (lead) {
      const logs = (callLogsCache[lead.id] || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      let streak = 0;
      for (const log of logs) { if (log.connection_status === 'No Answer') streak++; else break; }
      setConsecNA(streak);
    }
    setCallData(data);
    openModal();
  };

  const handleModalClose = async () => {
    const [allLogs, freshLeads] = await Promise.all([getAllCallLogs(), getLeads()]);
    setAllLogs(allLogs);
    setLeads(freshLeads);
  };

  const handleAddLead = async (formData) => {
    const id = await addLead(formData);
    addLeadToStore({ ...formData, id });
    setAddLeadOpen(false);
    setAddFlash(formData.name);
    setTimeout(() => setAddFlash(null), 2500);
  };

  const handleCsvImported = async () => {
    const freshLeads = await getLeads();
    setLeads(freshLeads);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 14, background: 'var(--bg0)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--amber)', letterSpacing: '.05em' }}>
          LeadSync<span style={{ color: 'var(--t1)' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)',
              animation: `bounce 1s ease-in-out ${i*.15}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes bounce{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar
        callActive={callActive}
        onAddLead={() => setAddLeadOpen(true)}
        onImport={() => setCsvOpen(true)}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {page === 'leads' && (
          <>
            <LeadList onDial={handleDial} />
            <LeadDetail onDial={handleDial} />
            {callActive && <CallSidebar onEndCall={handleEndCall} />}
          </>
        )}
        {page === 'today' && (
          <>
            <TodayView onDial={handleDial} onSelect={() => setPage('leads')} />
            <LeadDetail onDial={handleDial} />
            {callActive && <CallSidebar onEndCall={handleEndCall} />}
          </>
        )}
        {page === 'analytics' && <Analytics />}
      </div>

      {modalOpen && callData && (
        <PostCallModal callData={callData} consecutiveNoAnswers={consecNA} onClose={handleModalClose} />
      )}

      <AddLeadDrawer open={addLeadOpen} onClose={() => setAddLeadOpen(false)} onSave={handleAddLead} />

      {csvOpen && <CSVImport onClose={() => setCsvOpen(false)} onImported={handleCsvImported} />}

      {addFlash && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gbg)', border: '1px solid var(--gdim)', borderRadius: 4,
          padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)',
          zIndex: 400, animation: 'fadeup .3s ease', whiteSpace: 'nowrap' }}>
          ✓ {addFlash} added to leads
        </div>
      )}
      <style>{`@keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}
