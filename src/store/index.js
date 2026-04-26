import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  page: 'leads',
  setPage: page => set({ page }),

  leads: [],
  setLeads: leads => set({ leads }),
  updateLeadInStore: (id, patch) =>
    set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...patch } : l) })),
  addLeadToStore: lead => set(s => ({ leads: [lead, ...s.leads] })),
  removeLeadFromStore: id => set(s => ({
    leads: s.leads.filter(l => l.id !== id),
    selectedLead: s.selectedLead?.id === id ? null : s.selectedLead,
  })),

  milestones: [],
  setMilestones: ms => set({ milestones: ms }),

  pitchCues: [],
  setPitchCues: cues => set({ pitchCues: cues }),
  updatePitchCueInStore: (id, patch) =>
    set(s => ({ pitchCues: s.pitchCues.map(c => c.id === id ? { ...c, ...patch } : c) })),

  settings: { decay_days: 7 },
  setSettings: s => set({ settings: s }),

  selectedLead: null,
  setSelectedLead: lead => set({ selectedLead: lead }),

  // ─── Call state ──────────────────────────────────────────
  callActive: false,
  callLead: null,
  callSeconds: 0,
  callRunning: false,
  callChecked: [],
  callObjTags: [],
  callIntervalId: null,

  startCall: lead => set({
    callActive: true, callLead: lead,
    callSeconds: 0, callRunning: false,
    callChecked: [], callObjTags: [],
  }),

  startTimer: () => {
    const { callIntervalId } = get();
    if (callIntervalId) return;
    const id = setInterval(() => set(s => ({ callSeconds: s.callSeconds + 1 })), 1000);
    set({ callRunning: true, callIntervalId: id });
  },
  pauseTimer: () => {
    clearInterval(get().callIntervalId);
    set({ callRunning: false, callIntervalId: null });
  },
  resetTimer: () => {
    clearInterval(get().callIntervalId);
    set({ callSeconds: 0, callRunning: false, callIntervalId: null });
  },

  toggleMilestone: label => set(s => ({
    callChecked: s.callChecked.includes(label)
      ? s.callChecked.filter(l => l !== label)
      : [...s.callChecked, label],
  })),
  toggleObjTag: tag => set(s => ({
    callObjTags: s.callObjTags.includes(tag)
      ? s.callObjTags.filter(t => t !== tag)
      : [...s.callObjTags, tag],
  })),

  modalOpen: false,
  openModal: () => set({ modalOpen: true }),
  closeCall: () => {
    clearInterval(get().callIntervalId);
    set({
      callActive: false, callLead: null, callSeconds: 0,
      callRunning: false, callChecked: [], callObjTags: [],
      callIntervalId: null, modalOpen: false,
    });
  },

  callLogsCache: {},
  setLeadLogs: (leadId, logs) =>
    set(s => ({ callLogsCache: { ...s.callLogsCache, [leadId]: logs } })),
  appendLog: (leadId, log) =>
    set(s => ({
      callLogsCache: {
        ...s.callLogsCache,
        [leadId]: [log, ...(s.callLogsCache[leadId] || [])],
      },
    })),

  allLogs: [],
  setAllLogs: logs => set({ allLogs: logs }),

  search: '',
  statusFilter: null,
  sourceFilter: null,
  sortMode: 'priority',
  setSearch: v => set({ search: v }),
  setStatusFilter: v => set(s => ({ statusFilter: s.statusFilter === v ? null : v })),
  setSourceFilter: v => set(s => ({ sourceFilter: s.sourceFilter === v ? null : v })),
  setSortMode: v => set({ sortMode: v }),
}));
