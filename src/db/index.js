import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPDVuJSwTt6C2s_XxZH1PDiJDcd6uWdyQ",
  authDomain: "lead-sync-pro.firebaseapp.com",
  projectId: "lead-sync-pro",
  storageBucket: "lead-sync-pro.firebasestorage.app",
  messagingSenderId: "594245664815",
  appId: "1:594245664815:web:3164004ba78cf9e48bc6da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ─── Helper to Convert Firestore Timestamps to JS Dates ───────
function convertTimestamps(data) {
  if (!data) return data;
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] && typeof converted[key].toDate === 'function') {
      converted[key] = converted[key].toDate();
    }
  }
  return converted;
}

// ─── Enums ───────────────────────────────────────────────────
export const SOURCE   = { ENQUIRY: 'Enquiry', COLD_CALL: 'Cold Call', REFERRAL: 'Referral' };
export const STATUS   = { NEW: 'New', HOT: 'Hot', NURTURE: 'Nurture', ENROLLED: 'Enrolled', DEAD: 'Dead' };
export const CONN     = { CONNECTED: 'Connected', NO_ANSWER: 'No Answer', BUSY: 'Busy', INVALID: 'Invalid' };
export const OBJ_TAGS = ['Fees', 'Time', 'Unsure', 'Family', 'Competitor'];
export const COURSES  = [
  'Professional 6', 'Professional 5', 'IT 2', 'Commerce', 'Management 2',
  'Medicaal 2', 'Designer 2', 'Examcoach 2', 'Engg 2', 'Others 2',
  'ACCA', 'CA', 'CMA', 'CFA', 'CPA', 'EA', 'CMA USA'
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
    order: 1, title: 'Fee & Budget Objection (Feel-Felt-Found)',
    points: [
      'Acknowledge: "I completely understand how you feel about the fees..."',
      'Share: "Many of our now-successful students felt the exact same way at first..."',
      'Reframe: "But what they found is that with our ₹0 down EMI starting from just ₹2,100/month, the investment is easily covered by their first month salary."',
      'Ask: "If we split this into easy monthly payments, would that make it manageable for you?"',
    ],
  },
  {
    order: 2, title: 'Time / Work Balance (LAER)',
    points: [
      'Listen & Explore: "I hear you. Between your job/college and family, study time is tight. How many hours could you free up?"',
      'Explain Flex-schedule: "Our program is built for busy people—it only requires 6 hours a week (approx. 45-60 mins a day). You study whenever you have time."',
      'Reframe: "It’s about skill growth, not homework. If we set up a schedule around your weekend, would you be comfortable starting?"',
    ],
  },
  {
    order: 3, title: 'Family / Parents Deciding',
    points: [
      'Validate: "It’s awesome that you want their support. Parents want job safety and return on investment."',
      'Offer proof: "Let me WhatsApp you our placement stats and salary tracker so they can see our ₹4.2L average package."',
      'Action: "Let\'s schedule a brief 5-min parent counselor call tomorrow. Would 7:00 PM (end of shift) work for them?"',
    ],
  },
  {
    order: 4, title: 'Competitor / Online Videos',
    points: [
      'Contrast: "Others sell pre-recorded libraries. Avodha provides live mentor labs, portfolio builds, and direct placement support."',
      'Value focus: "Self-study has a 95% drop-out rate. We guide you step-by-step to build real projects that impress employers."',
      'Soft-close: "Do you want to buy cheap videos to watch alone, or join a system designed to get you hired?"',
    ],
  },
  {
    order: 5, title: 'Urgency & Micro-Commitment Close',
    points: [
      'Create Scarcity: "Our upcoming batch is starting soon, and we only have 4 slots remaining to keep classes small."',
      'Offer Trial: "Let\'s reserve your slot with a soft enrollment today so you don\'t lose early-bird pricing. You can attend the demo session this weekend."',
      'WhatsApp Micro-Commitment: "I\'ll send over the brochure. Read page 3 and message me which specialization path looks most exciting!"',
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
  // Seed Milestones
  const msSnap = await getDocs(collection(db, 'milestones'));
  if (msSnap.empty) {
    const batch = writeBatch(db);
    DEFAULT_MILESTONES.forEach(ms => {
      const docRef = doc(collection(db, 'milestones'));
      batch.set(docRef, ms);
    });
    await batch.commit();
  }

  // Seed Settings
  const docRef = doc(db, 'settings', 'global');
  const stSnap = await getDoc(docRef);
  if (!stSnap.exists()) {
    await setDoc(docRef, { decay_days: 7 });
  }

  // Seed Pitch Cues
  const pcSnap = await getDocs(collection(db, 'pitchCues'));
  if (pcSnap.empty) {
    const batch = writeBatch(db);
    DEFAULT_PITCH_CUES.forEach(pc => {
      const docRef = doc(collection(db, 'pitchCues'));
      batch.set(docRef, pc);
    });
    await batch.commit();
  }
}

// ─── CRUD helpers ─────────────────────────────────────────────
export async function getLeads() {
  const snap = await getDocs(collection(db, 'leads'));
  const leads = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  // Sort by name or fallback to id to keep stable ordering
  leads.sort((a, b) => a.name.localeCompare(b.name));
  return leads;
}

export async function getCallLogs(leadId) {
  const q = query(collection(db, 'callLogs'), where('lead_id', '==', leadId));
  const snap = await getDocs(q);
  const logs = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  // Sort logs by timestamp ascending in memory to avoid index requirement
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return logs;
}

export async function getAllCallLogs() {
  const snap = await getDocs(collection(db, 'callLogs'));
  const logs = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return logs;
}

export async function getMilestones() {
  const snap = await getDocs(collection(db, 'milestones'));
  const ms = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  ms.sort((a, b) => a.order - b.order);
  return ms;
}

export async function getPitchCues() {
  const snap = await getDocs(collection(db, 'pitchCues'));
  const cues = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  cues.sort((a, b) => a.order - b.order);
  return cues;
}

export async function getSettings() {
  const docRef = doc(db, 'settings', 'global');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

export async function addCallLog(log) {
  const docRef = await addDoc(collection(db, 'callLogs'), {
    ...log,
    timestamp: new Date()
  });
  return docRef.id;
}

export async function updateLead(id, patch) {
  const docRef = doc(db, 'leads', id);
  await updateDoc(docRef, patch);
}

export async function addLead(lead) {
  const docRef = await addDoc(collection(db, 'leads'), lead);
  return docRef.id;
}

export async function deleteLead(id) {
  // Delete the lead doc
  await deleteDoc(doc(db, 'leads', id));

  // Delete all associated call logs
  const q = query(collection(db, 'callLogs'), where('lead_id', '==', id));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function updatePitchCue(id, patch) {
  const docRef = doc(db, 'pitchCues', id);
  await updateDoc(docRef, patch);
}

export async function updateSettings(id, patch) {
  const docRef = doc(db, 'settings', 'global');
  await updateDoc(docRef, patch);
}

// ─── CSV import helper ────────────────────────────────────────
export async function importLeadsFromCSV(rows) {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);

  // Retrieve existing leads to check duplicates
  const existingLeads = await getLeads();
  const existingPhones = new Set(existingLeads.map(l => l.phone.replace(/\D/g, '')));

  let duplicateCount = 0;
  const clean = [];
  const cleanRowsOriginalIndices = [];

  rows.forEach((r, idx) => {
    const rawPhone = (r.phone || '').trim();
    if (!rawPhone) return;

    const digitsPhone = rawPhone.replace(/\D/g, '');
    if (existingPhones.has(digitsPhone)) {
      duplicateCount++;
      return; // Skip duplicate
    }

    // Add digits phone to existingPhones set so duplicates within the CSV itself are also filtered
    existingPhones.add(digitsPhone);

    clean.push({
      name:              (r.name || '').trim() || 'Unnamed Lead',
      phone:             rawPhone,
      email:             (r.email || '').trim(),
      course:            (r.course || '').trim(),
      source:            ['Enquiry','Cold Call','Referral'].includes(r.source) ? r.source : 'Cold Call',
      status:            ['New','Hot','Nurture','Enrolled','Dead'].includes(r.status) ? r.status : 'New',
      last_called_at:    new Date(0),
      next_follow_up_at: tomorrow,
    });
    cleanRowsOriginalIndices.push(idx);
  });

  if (!clean.length) {
    if (duplicateCount > 0) {
      throw new Error(`All leads in the CSV are already present in the database (${duplicateCount} duplicates skipped).`);
    }
    throw new Error('No valid rows found. Check phone column.');
  }

  const batch = writeBatch(db);
  const ids = [];
  clean.forEach(lead => {
    const docRef = doc(collection(db, 'leads'));
    batch.set(docRef, lead);
    ids.push(docRef.id);
  });
  await batch.commit();

  return {
    ids,
    cleanRowsOriginalIndices,
    importedCount: clean.length,
    duplicateCount,
  };
}
