import Dexie from 'dexie';

export const db = new Dexie('LeadSyncPro');

db.version(1).stores({
  leads:      '++id, name, phone, email, course, source, status, last_called_at, next_follow_up_at',
  callLogs:   '++id, lead_id, timestamp, duration_seconds, connection_status, rating, feedback_customer, feedback_self, *completed_milestones, *objection_tags',
  milestones: '++id, order, label',
  settings:   '++id, decay_days',
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

export const WHATSAPP_TEMPLATES = [
  "Hi {name}, this is from Avodha. We have an upcoming batch for {course} starting soon. Would you like to know more?",
  "Hi {name}, just following up on your interest in {course}. Our counselor is available today — shall I schedule a quick call?",
  "Hi {name}, reminder about your {course} enrollment discussion. We have only a few seats left in this batch!",
];

export const PITCH_CUES = [
  {
    title: 'Salary & placement proof',
    points: [
      'Avg. starting salary ₹4.2L — show live placement tracker',
      '92% placement rate in last 3 batches',
      'Top hirers: TCS, Infosys, Wipro, startups',
      "Ask: 'What salary are you targeting in 1 year?'",
    ],
  },
  {
    title: 'Fee & EMI objection',
    points: [
      '₹0 down EMI starting ₹2,100/month (24 months)',
      'Compare: 1 month salary covers full course fee',
      'Early enrollment discount ₹5,000 — expires this batch',
      '"Investment, not expense" reframe',
    ],
  },
  {
    title: 'Competitor comparison',
    points: [
      'We offer live projects — not recorded lectures',
      'Dedicated placement cell, not just a job portal',
      'Batch size 20 max — personal attention guaranteed',
      "Ask: 'What did they offer that we don't?'",
    ],
  },
  {
    title: 'Urgency & next step',
    points: [
      'Next batch starts in 12 days — 4 seats left',
      'Free demo class this Saturday 10 AM',
      "Soft-book: 'Should I reserve a seat while you decide?'",
      'WhatsApp brochure immediately post-call',
    ],
  },
];

// ─── Seed helpers ────────────────────────────────────────────
function rnd(a)  { return a[Math.floor(Math.random() * a.length)]; }
function ri(a,b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function daysAgo(n)    { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n){ return new Date(Date.now() + n * 86400000); }

const FIRST = ['Arjun','Priya','Rahul','Anjali','Mohammed','Sneha','Vishnu','Lakshmi','Rohan','Divya','Kiran','Meera','Arun','Nisha','Suresh','Asha','Deepak','Kavya','Sanjay','Pooja','Aditya','Reshma','Nikhil','Bindu','Vinod'];
const LAST  = ['Kumar','Sharma','Nair','Menon','Das','Pillai','Varma','Iyer','Reddy','Patel','Singh','Bose','Joshi','Ghosh','Verma','Rao','Thomas','George','Jose','Mathew'];

const FEEDBACKS = [
  'Interested, needs more time','Budget concern raised','Asked to call next week',
  'Very responsive','Needs parent approval','Ready to enroll soon',
  'Comparing with other institutes','Will discuss with family',
];
const SELF_NOTES = [
  'Explained course well','Should have asked about budget earlier',
  'Good rapport built','Missed salary stats opportunity',
  'Rushed the close — slow down','Need to mention demo earlier',
];

function generateLeads(count = 40) {
  return Array.from({ length: count }, (_, i) => {
    const src = i < 12 ? SOURCE.ENQUIRY : i < 35 ? SOURCE.COLD_CALL : SOURCE.REFERRAL;
    const st  = i < 4 ? STATUS.HOT : i < 8 ? STATUS.NEW : Object.values(STATUS)[i % 5];
    return {
      name:              `${rnd(FIRST)} ${rnd(LAST)}`,
      phone:             `+91 ${ri(70000,99999)} ${ri(10000,99999)}`,
      email:             `${FIRST[i % FIRST.length].toLowerCase()}${i + 1}@gmail.com`,
      course:            COURSES[i % COURSES.length],
      source:            src,
      status:            st,
      last_called_at:    daysAgo(ri(0, 14)),
      next_follow_up_at: daysFromNow(ri(0, 7)),
    };
  });
}

function generateCallLogs(leads) {
  const logs = [];
  leads.slice(0, 28).forEach(lead => {
    const n = ri(1, 4);
    for (let c = 0; c < n; c++) {
      const conn = rnd(Object.values(CONN));
      logs.push({
        lead_id:             lead.id,
        timestamp:           daysAgo(ri(0, 20)),
        duration_seconds:    conn === CONN.CONNECTED ? ri(90, 900) : ri(0, 25),
        connection_status:   conn,
        rating:              conn === CONN.CONNECTED ? ri(2, 5) : null,
        feedback_customer:   conn === CONN.CONNECTED ? rnd(FEEDBACKS) : '',
        feedback_self:       conn === CONN.CONNECTED ? rnd(SELF_NOTES) : '',
        completed_milestones: conn === CONN.CONNECTED
          ? DEFAULT_MILESTONES.slice(0, ri(2, 6)).map(m => m.label)
          : [],
        objection_tags: conn === CONN.CONNECTED && ri(0, 1) ? [rnd(OBJ_TAGS)] : [],
      });
    }
  });
  return logs;
}

// ─── One-time seed ────────────────────────────────────────────
export async function seedDatabase() {
  const count = await db.leads.count();
  if (count > 0) return;

  const leads = generateLeads(40);
  const insertedIds = await db.leads.bulkAdd(leads, { allKeys: true });
  const leadsWithIds = leads.map((l, i) => ({ ...l, id: insertedIds[i] }));
  const logs = generateCallLogs(leadsWithIds);
  await db.callLogs.bulkAdd(logs);
  await db.milestones.bulkAdd(DEFAULT_MILESTONES);
  await db.settings.add({ decay_days: 7 });
}

// ─── CRUD helpers ────────────────────────────────────────────
export async function getLeads()            { return db.leads.orderBy('id').toArray(); }
export async function getCallLogs(leadId)   { return db.callLogs.where('lead_id').equals(leadId).sortBy('timestamp'); }
export async function getAllCallLogs()       { return db.callLogs.orderBy('timestamp').toArray(); }
export async function getMilestones()       { return db.milestones.orderBy('order').toArray(); }
export async function getSettings()         { return db.settings.limit(1).first(); }

export async function addCallLog(log)       { return db.callLogs.add({ ...log, timestamp: new Date() }); }
export async function updateLead(id, patch) { return db.leads.update(id, patch); }
export async function addLead(lead)         { return db.leads.add(lead); }
