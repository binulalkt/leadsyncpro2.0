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

export const DEFAULT_JAP_JOBS = [
  {
    job_id: "JAP-201",
    title: "React & Node Developer",
    company: "Avodha Tech Labs",
    course: "IT 2",
    type: "Job",
    openings: 3,
    location: "Kochi, Kerala (On-site)",
    salary: "₹25,000 - ₹35,000 / month",
    description: "Full stack developer proficient in React, Node.js, and MongoDB. Will work on CRM and e-learning platforms.",
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-202",
    title: "Frontend Intern",
    company: "DigiTech Solutions",
    course: "IT 2",
    type: "Internship",
    openings: 5,
    location: "Remote",
    salary: "₹8,000 / month",
    description: "Learn and build interactive user interfaces using React, HTML, and vanilla CSS.",
    postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-203",
    title: "UI/UX Designer",
    company: "Creative Minds Studio",
    course: "Designer 2",
    type: "Job",
    openings: 2,
    location: "Bangalore (Hybrid)",
    salary: "₹30,000 - ₹40,000 / month",
    description: "Design user flows, wireframes, and high-fidelity screens for mobile and web apps using Figma.",
    postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-204",
    title: "Graphic Designer Intern",
    company: "SocialPulse Marketing",
    course: "Designer 2",
    type: "Internship",
    openings: 4,
    location: "Kochi, Kerala",
    salary: "₹7,000 / month",
    description: "Design social media banners, advertisements, and promotional templates under the marketing lead's guidance.",
    postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-205",
    title: "Junior Accountant",
    company: "KPMG Associates",
    course: "Commerce",
    type: "Job",
    openings: 6,
    location: "Ernakulam, Kerala",
    salary: "₹20,000 - ₹25,000 / month",
    description: "Manage accounts payable/receivable, prepare bank reconciliations, and compile financial reports using Tally Prime.",
    postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-206",
    title: "Audit Assistant Intern",
    company: "Nambiar & Co. CAs",
    course: "Commerce",
    type: "Internship",
    openings: 3,
    location: "Calicut, Kerala",
    salary: "₹10,000 / month",
    description: "Assist in statutory audit files preparation, physical stock checks, and basic taxation computations.",
    postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-207",
    title: "Business Development Executive",
    company: "Avodha Careers",
    course: "Management 2",
    type: "Job",
    openings: 10,
    location: "Kochi, Kerala",
    salary: "₹22,000 - ₹30,000 / month",
    description: "Drive sales campaigns, follow up with student enquiries, and achieve monthly enrollment targets.",
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-208",
    title: "HR Recruiter Intern",
    company: "PeopleFirst HR Solutions",
    course: "Management 2",
    type: "Internship",
    openings: 2,
    location: "Remote",
    salary: "₹9,000 / month",
    description: "Source profiles from job boards, conduct initial telephonic screening, and schedule interviews.",
    postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-209",
    title: "Medical Coding Associate",
    company: "CareHealth Systems",
    course: "Medicaal 2",
    type: "Job",
    openings: 8,
    location: "Coimbatore, Tamil Nadu",
    salary: "₹24,000 - ₹28,000 / month",
    description: "Review patient records and translate medical diagnoses/procedures into ICD-10 and CPT codes.",
    postedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-210",
    title: "Hospital Admin Intern",
    company: "Sunrise Specialty Clinic",
    course: "Medicaal 2",
    type: "Internship",
    openings: 2,
    location: "Trivandrum, Kerala",
    salary: "₹6,000 / month",
    description: "Handle front office reception desk, schedule doctor appointments, and manage patient entry records.",
    postedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-211",
    title: "Corporate Tax Specialist",
    company: "EY Global Services",
    course: "ACCA",
    type: "Job",
    openings: 3,
    location: "Bangalore",
    salary: "₹45,000 - ₹55,000 / month",
    description: "Perform international tax assessments and prepare client filings. ACCA certification (part or fully qualified) is required.",
    postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-212",
    title: "ACCA Trainee Intern",
    company: "BDO India",
    course: "ACCA",
    type: "Internship",
    openings: 4,
    location: "Kochi, Kerala",
    salary: "₹12,000 / month",
    description: "Gain training in internal audit procedures, risk advisory, and corporate governance compliance.",
    postedDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-213",
    title: "Cost Accountant Associate",
    company: "Aditya Birla Group",
    course: "CMA",
    type: "Job",
    openings: 2,
    location: "Chennai",
    salary: "₹35,000 - ₹45,000 / month",
    description: "Analyze manufacturing overhead costs, material variances, and compile product pricing recommendations.",
    postedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-214",
    title: "Executive Counselor",
    company: "Avodha Placement Team",
    course: "Professional 6",
    type: "Job",
    openings: 5,
    location: "Kochi, Kerala",
    salary: "₹28,000 - ₹38,000 / month",
    description: "Manage the counseling department operations and oversee career counseling metrics.",
    postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-215",
    title: "Career Counselor Intern",
    company: "Edustart Advisory",
    course: "Professional 6",
    type: "Internship",
    openings: 3,
    location: "Remote",
    salary: "₹10,000 / month",
    description: "Interact with students to guide them through career choices and program curriculum overview.",
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-216",
    title: "Sales Team Lead",
    company: "SkillUp Academy",
    course: "Professional 5",
    type: "Job",
    openings: 2,
    location: "Kochi, Kerala",
    salary: "₹30,000 - ₹42,000 / month",
    description: "Train and lead a team of junior telesales counselors to hit monthly sales targets.",
    postedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-217",
    title: "Content Developer (TET/PSC)",
    company: "Target Coaching Academy",
    course: "Examcoach 2",
    type: "Job",
    openings: 4,
    location: "Trivandrum, Kerala",
    salary: "₹18,000 - ₹24,000 / month",
    description: "Prepare mock test papers, study notes, and syllabus analysis for Kerala PSC/TET exams.",
    postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-218",
    title: "Tutor Intern (Math & Science)",
    company: "ExamPrep Online",
    course: "Examcoach 2",
    type: "Internship",
    openings: 6,
    location: "Remote",
    salary: "₹7,500 / month",
    description: "Explain problem-solving steps and deliver doubt-clearing sessions via Zoom for school students.",
    postedDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-219",
    title: "CAD Design Engineer",
    company: "Automech Industries",
    course: "Engg 2",
    type: "Job",
    openings: 3,
    location: "Kochi, Kerala",
    salary: "₹22,000 - ₹28,000 / month",
    description: "Produce 3D models and assembly draft drawings for mechanical components using AutoCAD/Solidworks.",
    postedDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-220",
    title: "Embedded Systems Intern",
    company: "ElectroLabs India",
    course: "Engg 2",
    type: "Internship",
    openings: 2,
    location: "Coimbatore, Tamil Nadu",
    salary: "₹8,000 / month",
    description: "Work on microcontroller programming, circuit prototyping, and sensor integration testing.",
    postedDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-221",
    title: "Financial Analyst",
    company: "Cargill Corporate Finance",
    course: "CMA USA",
    type: "Job",
    openings: 2,
    location: "Bangalore (Hybrid)",
    salary: "₹40,000 - ₹50,000 / month",
    description: "Develop budget forecasting models and conduct profitability analysis. Requires knowledge of CMA USA concepts.",
    postedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  },
  {
    job_id: "JAP-222",
    title: "Management Accountant Intern",
    company: "Apex Global Finance",
    course: "CMA USA",
    type: "Internship",
    openings: 3,
    location: "Remote",
    salary: "₹12,000 / month",
    description: "Prepare variance reports, spreadsheet logs, and coordinate cost-center reports collation.",
    postedDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000)
  }
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

  // Seed JAP Jobs
  const jobsSnap = await getDocs(collection(db, 'japJobs'));
  if (jobsSnap.empty) {
    const batch = writeBatch(db);
    DEFAULT_JAP_JOBS.forEach(job => {
      const docRef = doc(collection(db, 'japJobs'));
      batch.set(docRef, job);
    });
    await batch.commit();
  }
}

// ─── Jobs CRUD & Simulation ───────────────────────────────────
export async function getJapJobs() {
  const snap = await getDocs(collection(db, 'japJobs'));
  const jobs = snap.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  // Sort by job_id ascending
  jobs.sort((a, b) => a.job_id.localeCompare(b.job_id));
  return jobs;
}

export async function syncJapJobs() {
  // Simulate fetching new jobs from jap.avodha.org.
  // Add some new jobs to the database if they are not already there.
  const snap = await getDocs(collection(db, 'japJobs'));
  const existingJobIds = new Set(snap.docs.map(doc => doc.data().job_id));
  
  const EXTRA_JOBS = [
    {
      job_id: "JAP-223",
      title: "Tax Specialist (EA)",
      company: "H&R Block India",
      course: "EA",
      type: "Job",
      openings: 3,
      location: "Kochi, Kerala (Hybrid)",
      salary: "₹32,000 - ₹38,000 / month",
      description: "Prepare US individual tax returns, audit representation logs, and research tax regulations. EA certification is highly preferred.",
      postedDate: new Date()
    },
    {
      job_id: "JAP-224",
      title: "Product Designer (UI/UX)",
      company: "Innovate Fintech",
      course: "Designer 2",
      type: "Job",
      openings: 2,
      location: "Remote",
      salary: "₹45,000 - ₹55,000 / month",
      description: "Lead user research, prototyping, and collaborate with engineering to ship visual features for our payment app.",
      postedDate: new Date()
    },
    {
      job_id: "JAP-225",
      title: "Content Marketing Intern",
      company: "Avodha Marketing Group",
      course: "Others 2",
      type: "Internship",
      openings: 5,
      location: "Kochi, Kerala (On-site)",
      salary: "₹8,500 / month",
      description: "Write SEO blog posts, assist in scripting marketing campaigns, and manage social media handles.",
      postedDate: new Date()
    }
  ];

  const batch = writeBatch(db);
  let newlyAdded = 0;
  EXTRA_JOBS.forEach(job => {
    if (!existingJobIds.has(job.job_id)) {
      const docRef = doc(collection(db, 'japJobs'));
      batch.set(docRef, job);
      newlyAdded++;
    }
  });

  if (newlyAdded > 0) {
    await batch.commit();
  }
  
  return getJapJobs();
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
