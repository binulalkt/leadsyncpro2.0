import { useEffect, useState } from 'react';
import './index.css';
import { seedDatabase, getLeads, getMilestones, getSettings, getAllCallLogs, getCallLogs } from './db';
import { useAppStore } from './store';
import Topbar from './components/Topbar';
import LeadList from './components/LeadList';
import LeadDetail from './components/LeadDetail';
import CallSidebar from './components/CallSidebar';
import PostCallModal from './components/PostCallModal';
import Analytics from './components/Analytics';

export default function App() {
  const {
    page, setLeads, setMilestones, setSettings, setAllLogs,
    callActive, startCall, openModal, modalOpen,
    callLogsCache, setLeadLogs,
  } = useAppStore();

  const [loading,  setLoading]  = useState(true);
  const [callData, setCallData] = useState(null);
  const [consecNA, setConsecNA] = useState(0);

  useEffect(() => {
    (async () => {
      await seedDatabase();
      const [leads, milestones, settings, allLogs] = await Promise.all([
        getLeads(), getMilestones(), getSettings(), getAllCallLogs(),
      ]);
      setLeads(leads);
      setMilestones(milestones);
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
      for (const log of logs) {
        if (log.connection_status === 'No Answer') streak++;
        else break;
      }
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

  if (loading) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column', gap:14, background:'var(--bg0)' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--amber)', letterSpacing:'.05em' }}>
          LeadSync<span style={{ color:'var(--t1)' }}>Pro</span>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)',
              animation:`bounce 1s ease-in-out ${i*.15}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes bounce{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar callActive={callActive} />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {page === 'leads' && (
          <>
            <LeadList onDial={handleDial} />
            <LeadDetail onDial={handleDial} />
            {callActive && <CallSidebar onEndCall={handleEndCall} />}
          </>
        )}
        {page === 'analytics' && <Analytics />}
      </div>
      {modalOpen && callData && (
        <PostCallModal callData={callData} consecutiveNoAnswers={consecNA} onClose={handleModalClose} />
      )}
    </div>
  );
}
