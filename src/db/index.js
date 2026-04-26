import Dexie from 'dexie';

export const db = new Dexie('LeadSyncPro');

db.version(1).stores({
  leads:      '++id, name, phone, email, course, source, status, last_called_at, next_follow_up_at',
  callLogs:   '++id, lead_id, timestamp, duration_seconds, connection_status, rating, feedback_customer, feedback_self, *completed_milestones, *objection_tags',
  milestones: '++id, order, label',
  settings:   '++id, decay_days',
  pitchCues:  '++id, order, title, points',
});

// ─── Enums ───────────────────────────────────────────────────
export const SOURCE   = { ENQUIRY: 'Enquiry', COLD_CALL: 'Cold Call', REFERRAL: 'Referral' };
export const STATUS   = { NEW: 'New', HOT: 'Hot', NURTURE: 'Nurture', ENROLLED: 'Enrolled', DEAD: 'Dead' };
export const CONN     = { CONNECTED: 'Connected', NO_ANSWER: 'No Answer', BUSY: 'Busy', INVALID: 'Invalid' };
export const OBJ_TAGS = ['Fees', 'Time', 'Unsure', 'Family', 'Competitor'];
export const COURSES  = [
  'Data Science', 'MERN Stack', 'Flutter Dev', 'UI/UX Design',
  'Digital Marketing', 'Ethical Hacking', 'Python Full Stack', 'Cloud Computing',
  'Machine Learning', 'React Native', 'DevOps', 'Java Full Stack',
];

export const DEFAULT_MILESTONES = [
  { order: 1, label: 'Greeted & verified interest' },
  { order: 2, label: 'Course overview done' },
  { order: 3, label: 'Salary discussed' },
  { order: 4, label: 'Placement stats shared' },
  { order: 5, label: 'EMI / fee structure explained' },
  { order: 6, label: 'Demo / trial offered' },
  { order: 7, label: 'Objection handled' },
  { order: 8, label: 'Next step agreed upon' },
];

// Stored in DB so they can be edited at runtime
export const DEFAULT_PITCH_CUES = [
  {
    order: 1, title: 'Salary & placement proof',
    points: [
      'Avg. starting salary ₹4.2L — show live placement tracker',
      '92% placement rate in last 3 batches',
      'Top hirers: TCS, Infosys, Wipro, startups',
      "Ask: 'What salary are you targeting in 1 year?'",
    ],
  },
  {
    order: 2, title: 'Fee & EMI objection',
    points: [
      '₹0 down EMI starting ₹2,100/month (24 months)',
      'Compare: 1 month salary covers full course fee',
      'Early enrollment discount ₹5,000 — expires this batch',
      '"Investment, not expense" reframe',
    ],
  },
  {
    order: 3, title: 'Competitor comparison',
    points: [
      'We offer live projects — not recorded lectures',
      'Dedicated placement cell, not just a job portal',
      'Batch size 20 max — personal attention guaranteed',
      "Ask: 'What did they offer that we don't?'",
    ],
  },
  {
    order: 4, title: 'Urgency & next step',
    points: [
      'Next batch starts in 12 days — 4 seats left',
      'Free demo class this Saturday 10 AM',
      "Soft-book: 'Should I reserve a seat while you decide?'",
      'WhatsApp brochure immediately post-call',
    ],
  },
];

export const WHATSAPP_TEMPLATES = [
  "Hi {name}, this is from Avodha. We have an upcoming batch for {course} starting soon. Would you like to know more?",
  "Hi {name}, just following up on your interest in {course}. Our counselor is available today — shall I schedule a quick call?",
  "Hi {name}, reminder about your {course} enrollment. We have only a few seats left in this batch!",
];

// ─── Seed (no fake leads — only structure data) ───────────────
export async function seedDatabase() {
  const msCount = await db.milestones.count();
  if (msCount === 0) await db.milestones.bulkAdd(DEFAULT_MILESTONES);

  const stCount = await db.settings.count();
  if (stCount === 0) await db.settings.add({ decay_days: 7 });

  const pcCount = await db.pitchCues.count();
  if (pcCount === 0) await db.pitchCues.bulkAdd(DEFAULT_PITCH_CUES);
}

// ─── CRUD helpers ─────────────────────────────────────────────
export async function getLeads()              { return db.leads.orderBy('id').toArray(); }
export async function getCallLogs(leadId)     { return db.callLogs.where('lead_id').equals(leadId).sortBy('timestamp'); }
export async function getAllCallLogs()         { return db.callLogs.orderBy('timestamp').toArray(); }
export async function getMilestones()         { return db.milestones.orderBy('order').toArray(); }
export async function getPitchCues()          { return db.pitchCues.orderBy('order').toArray(); }
export async function getSettings()           { return db.settings.limit(1).first(); }

export async function addCallLog(log)         { return db.callLogs.add({ ...log, timestamp: new Date() }); }
export async function updateLead(id, patch)   { return db.leads.update(id, patch); }
export async function addLead(lead)           { return db.leads.add(lead); }
export async function deleteLead(id)          { return db.transaction('rw', db.leads, db.callLogs, async () => {
  await db.callLogs.where('lead_id').equals(id).delete();
  await db.leads.delete(id);
}); }
export async function updatePitchCue(id, patch) { return db.pitchCues.update(id, patch); }
export async function updateSettings(id, patch) { return db.settings.update(id, patch); }

// ─── CSV import helper ────────────────────────────────────────
export async function importLeadsFromCSV(rows) {
  // rows = [{ name, phone, email?, course?, source?, status? }, ...]
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const clean = rows.map(r => ({
    name:              (r.name || '').trim(),
    phone:             (r.phone || '').trim(),
    email:             (r.email || '').trim(),
    course:            (r.course || '').trim(),
    source:            ['Enquiry','Cold Call','Referral'].includes(r.source) ? r.source : 'Cold Call',
    status:            ['New','Hot','Nurture','Enrolled','Dead'].includes(r.status) ? r.status : 'New',
    last_called_at:    new Date(0),
    next_follow_up_at: tomorrow,
  })).filter(r => r.name && r.phone);
  if (!clean.length) throw new Error('No valid rows found. Check name and phone columns.');
  return db.leads.bulkAdd(clean, { allKeys: true });
}
