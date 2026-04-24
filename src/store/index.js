import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // ─── Navigation ───────────────────────────────────────────
  page: 'leads',          // 'leads' | 'analytics'
  setPage: page => set({ page }),

  // ─── Leads ───────────────────────────────────────────────
  leads: [],
  setLeads: leads => set({ leads }),
  updateLeadInStore: (id, patch) =>
    set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...patch } : l) })),
  addLeadToStore: lead => set(s => ({ leads: [lead, ...s.leads] })),

  // ─── Milestones ──────────────────────────────────────────
  milestones: [],
  setMilestones: ms => set({ milestones: ms }),

  // ─── Settings ────────────────────────────────────────────
  settings: { decay_days: 7 },
  setSettings: s => set({ settings: s }),

  // ─── Selected lead (detail panel) ────────────────────────
  selectedLead: null,
  setSelectedLead: lead => set({ selectedLead: lead }),

  // ─── Live call state ──────────────────────────────────────
  callActive: false,
  callLead: null,
  callSeconds: 0,
  callRunning: false,
  callChecked: [],      // milestone labels completed
  callObjTags: [],      // objection tags fired
  callIntervalId: null,

  startCall: lead => {
    set({
      callActive: true,
      callLead: lead,
      callSeconds: 0,
      callRunning: false,
      callChecked: [],
      callObjTags: [],
    });
  },
  endCallSetup: () => set({ callRunning: false }),

  startTimer: () => {
    const { callIntervalId } = get();
    if (callIntervalId) return;
    const id = setInterval(() => set(s => ({ callSeconds: s.callSeconds + 1 })), 1000);
    set({ callRunning: true, callIntervalId: id });
  },
  pauseTimer: () => {
    const { callIntervalId } = get();
    clearInterval(callIntervalId);
    set({ callRunning: false, callIntervalId: null });
  },
  resetTimer: () => {
    const { callIntervalId } = get();
    clearInterval(callIntervalId);
    set({ callSeconds: 0, callRunning: false, callIntervalId: null });
  },

  toggleMilestone: label =>
    set(s => ({
      callChecked: s.callChecked.includes(label)
        ? s.callChecked.filter(l => l !== label)
        : [...s.callChecked, label],
    })),

  toggleObjTag: tag =>
    set(s => ({
      callObjTags: s.callObjTags.includes(tag)
        ? s.callObjTags.filter(t => t !== tag)
        : [...s.callObjTags, tag],
    })),

  // ─── Post-call modal ──────────────────────────────────────
  modalOpen: false,
  openModal: () => set({ modalOpen: true }),
  closeCall: () => {
    const { callIntervalId } = get();
    clearInterval(callIntervalId);
    set({
      callActive: false,
      callLead: null,
      callSeconds: 0,
      callRunning: false,
      callChecked: [],
      callObjTags: [],
      callIntervalId: null,
      modalOpen: false,
    });
  },

  // ─── Call logs cache ─────────────────────────────────────
  callLogsCache: {},   // { [leadId]: [...logs] }
  setLeadLogs: (leadId, logs) =>
    set(s => ({ callLogsCache: { ...s.callLogsCache, [leadId]: logs } })),
  appendLog: (leadId, log) =>
    set(s => ({
      callLogsCache: {
        ...s.callLogsCache,
        [leadId]: [log, ...(s.callLogsCache[leadId] || [])],
      },
    })),

  // ─── All logs (analytics) ─────────────────────────────────
  allLogs: [],
  setAllLogs: logs => set({ allLogs: logs }),

  // ─── UI filters ──────────────────────────────────────────
  search: '',
  statusFilter: null,
  sourceFilter: null,
  sortMode: 'priority',
  setSearch: v => set({ search: v }),
  setStatusFilter: v => set(s => ({ statusFilter: s.statusFilter === v ? null : v })),
  setSourceFilter: v => set(s => ({ sourceFilter: s.sourceFilter === v ? null : v })),
  setSortMode: v => set({ sortMode: v }),
}));
