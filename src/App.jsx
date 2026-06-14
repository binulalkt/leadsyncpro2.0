import { useEffect, useState } from 'react';
import './index.css';
import { seedDatabase, getLeads, getMilestones, getSettings, getAllCallLogs, getCallLogs, addLead, getPitchCues, getJapJobs } from './db';
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
import JAPJobs from './components/JAPJobs';

export default function App() {
  const {
    page, setPage, setLeads, setMilestones, setSettings, setAllLogs,
    setPitchCues, callActive, startCall, openModal, modalOpen,
    callLogsCache, setLeadLogs, addLeadToStore, selectedLead,
    setJapJobs, setLastJobsSync
  } = useAppStore();

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);
  const [callData,    setCallData]    = useState(null);
  const [consecNA,    setConsecNA]    = useState(0);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [csvOpen,     setCsvOpen]     = useState(false);
  const [addFlash,    setAddFlash]    = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await seedDatabase();
        const [leads, milestones, settings, allLogs, pitchCues, jobs] = await Promise.all([
          getLeads(), getMilestones(), getSettings(), getAllCallLogs(), getPitchCues(), getJapJobs(),
        ]);
        setLeads(leads);
        setMilestones(milestones);
        setPitchCues(pitchCues);
        if (settings) setSettings(settings);
        setAllLogs(allLogs);
        setJapJobs(jobs);
        setLastJobsSync(new Date(Date.now() - 30 * 60 * 1000)); // Simulate synced 30 mins ago initially
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err);
        setLoading(false);
      }
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

  if (error) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg0)', padding: 20
      }}>
        <div style={{
          maxWidth: 600, width: '100%', background: 'var(--bg1)', border: '1px solid var(--rdim)',
          borderRadius: 8, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          fontFamily: 'var(--mono)', color: 'var(--t1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)', marginBottom: 16 }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>Firebase Connection Error</span>
          </div>
          
          <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
            Firestore database request rejected. This usually happens because your Firebase Security Rules are set to locked mode.
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>How to fix:</div>
            <ol style={{ fontSize: 11, color: 'var(--t1)', paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
              <li>Go to your <strong>Firebase Console</strong>.</li>
              <li>Open your project and navigate to <strong>Firestore Database</strong>.</li>
              <li>Click the <strong>Rules</strong> tab at the top.</li>
              <li>Replace the existing rules with the template below to allow read/write:</li>
            </ol>
          </div>

          <pre style={{
            background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 4,
            padding: 12, fontSize: 10, color: 'var(--amber)', overflowX: 'auto', marginBottom: 20,
            lineHeight: 1.4
          }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-ghost" style={{ fontSize: 10, height: 32, padding: '0 12px' }} onClick={() => window.location.reload()}>
              🔄 RETRY CONNECTION
            </button>
          </div>
        </div>
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
        {isMobile ? (
          callActive ? (
            <CallSidebar onEndCall={handleEndCall} />
          ) : (
            <>
              {page === 'leads' && (selectedLead ? <LeadDetail onDial={handleDial} /> : <LeadList onDial={handleDial} />)}
              {page === 'today' && (selectedLead ? <LeadDetail onDial={handleDial} /> : <TodayView onDial={handleDial} onSelect={() => setPage('leads')} />)}
              {page === 'analytics' && <Analytics />}
              {page === 'jobs' && <JAPJobs />}
            </>
          )
        ) : (
          <>
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
            {page === 'jobs' && <JAPJobs />}
          </>
        )}
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
