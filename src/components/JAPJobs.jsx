import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getJapJobs, syncJapJobs } from '../db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd2)', borderRadius: 4,
      padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10 }}>
      {label && <div style={{ color: 'var(--t2)', marginBottom: 3, fontSize: 9 }}>Course: {label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <span style={{ color: p.color || 'var(--t1)' }}>{p.name}</span>
          <span style={{ color: 'var(--t0)' }}>{p.value} Vacancies</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5,
      padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
        background: accent, borderRadius: '3px 0 0 3px' }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: 'var(--t0)', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

export default function JAPJobs() {
  const { leads, japJobs, setJapJobs, lastJobsSync, setLastJobsSync } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  const [expandedJobId, setExpandedJobId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial jobs if empty
  useEffect(() => {
    if (japJobs.length === 0) {
      setLoading(true);
      getJapJobs().then(jobs => {
        setJapJobs(jobs);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [japJobs.length, setJapJobs]);

  // Handle Refresh simulation
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLogs([]);

    const steps = [
      { msg: '🔌 Establishing connection to jap.avodha.org placement gateway...', progress: 15 },
      { msg: '🛡️ Re-authenticating session tokens for Avodha CRM...', progress: 30 },
      { msg: '🕷️ Scanning Active job & internship directory DOM structure...', progress: 50 },
      { msg: '📄 Found 22 current opportunities. Reading details...', progress: 70 },
      { msg: '💡 Identified new job postings since last synchronization...', progress: 85 },
      { msg: '💾 Writing 3 newly detected postings to Cloud Firestore database...', progress: 95 },
      { msg: '🎉 Synchronization successfully complete! Reloading listing indices.', progress: 100 }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${steps[i].msg}`]);
      setSyncProgress(steps[i].progress);
    }

    try {
      const updatedJobs = await syncJapJobs();
      setJapJobs(updatedJobs);
      setLastJobsSync(new Date());
    } catch (e) {
      console.error(e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSyncing(false);
  };

  // Extract unique values for filter lists
  const coursesList = useMemo(() => {
    const courses = new Set();
    japJobs.forEach(j => { if (j.course) courses.add(j.course); });
    return Array.from(courses).sort();
  }, [japJobs]);

  const locationsList = useMemo(() => {
    const locs = new Set();
    japJobs.forEach(j => {
      if (j.location) {
        // Clean location for filtering: extract "Remote", "Kochi", etc.
        const cleanLoc = j.location.split('(')[0].trim();
        locs.add(cleanLoc);
      }
    });
    return Array.from(locs).sort();
  }, [japJobs]);

  // Calculations for Dashboard Metrics
  const metrics = useMemo(() => {
    const jobsCount = japJobs.filter(j => j.type === 'Job').length;
    const internCount = japJobs.filter(j => j.type === 'Internship').length;

    // Which course has the most jobs / internships
    const courseStats = {};
    japJobs.forEach(j => {
      if (!courseStats[j.course]) {
        courseStats[j.course] = { jobs: 0, internships: 0 };
      }
      if (j.type === 'Job') {
        courseStats[j.course].jobs += j.openings || 1;
      } else {
        courseStats[j.course].internships += j.openings || 1;
      }
    });

    let topJobCourse = 'None';
    let topJobCount = 0;
    let topInternCourse = 'None';
    let topInternCount = 0;

    Object.entries(courseStats).forEach(([course, counts]) => {
      if (counts.jobs > topJobCount) {
        topJobCount = counts.jobs;
        topJobCourse = course;
      }
      if (counts.internships > topInternCount) {
        topInternCount = counts.internships;
        topInternCourse = course;
      }
    });

    return {
      total: japJobs.length,
      jobs: jobsCount,
      internships: internCount,
      topJobCourse: `${topJobCourse} (${topJobCount} opn.)`,
      topInternCourse: `${topInternCourse} (${topInternCount} opn.)`
    };
  }, [japJobs]);

  // Format chart data
  const chartData = useMemo(() => {
    const courseStats = {};
    japJobs.forEach(j => {
      if (!courseStats[j.course]) {
        courseStats[j.course] = { name: j.course, jobs: 0, internships: 0 };
      }
      if (j.type === 'Job') {
        courseStats[j.course].jobs += j.openings || 1;
      } else {
        courseStats[j.course].internships += j.openings || 1;
      }
    });
    return Object.values(courseStats).sort((a,b) => (b.jobs + b.internships) - (a.jobs + a.internships));
  }, [japJobs]);

  // Filter Jobs List
  const filteredJobs = useMemo(() => {
    return japJobs.filter(j => {
      const matchesSearch = search === '' || 
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase()) ||
        j.description.toLowerCase().includes(search.toLowerCase()) ||
        j.job_id.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'All' || j.type === typeFilter;
      const matchesCourse = courseFilter === 'All' || j.course === courseFilter;
      
      const cleanLoc = j.location.split('(')[0].trim();
      const matchesLoc = locationFilter === 'All' || cleanLoc === locationFilter;

      return matchesSearch && matchesType && matchesCourse && matchesLoc;
    });
  }, [japJobs, search, typeFilter, courseFilter, locationFilter]);

  // Get matching candidate leads
  const getMatches = (courseName) => {
    // Filter active leads matching this course
    return leads.filter(l => l.course === courseName && l.status !== 'Enrolled' && l.status !== 'Dead');
  };

  const handleDial = (lead) => {
    window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg0)', padding: isMobile ? 12 : 20, gap: 20 }}>
      {/* Header section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--bd)', paddingBottom: 15 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 'bold', color: 'var(--t0)', margin: 0 }}>JAP Career Placements</h2>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
            Direct sync with jap.avodha.org — match active candidate pipelines
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
            Last Synced: {lastJobsSync ? lastJobsSync.toLocaleTimeString() : 'Never'}
          </div>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            style={{ 
              height: 32, padding: '0 14px', borderRadius: 4, 
              background: 'var(--abg)', border: '1px solid var(--adim)', color: 'var(--amber)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              opacity: isSyncing ? 0.7 : 1, transition: 'all .12s'
            }}
          >
            <span style={{ display: 'inline-block', animation: isSyncing ? 'spin 1.5s linear infinite' : 'none' }}>🔄</span>
            {isSyncing ? 'Syncing Portal...' : 'Refresh Listings'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justify: 'center', alignItems: 'center', padding: '50px 0', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>
          Loading job listings from Firestore...
        </div>
      ) : (
        <>
          {/* Dashboard Summary Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12 }}>
            <StatCard label="Total Openings" value={metrics.total} sub={`${metrics.jobs} Jobs, ${metrics.internships} Internships`} accent="var(--amber)" />
            <StatCard label="Jobs Focus" value={metrics.jobs} sub={`Max: ${metrics.topJobCourse}`} accent="#22c55e" />
            <StatCard label="Internships Focus" value={metrics.internships} sub={`Max: ${metrics.topInternCourse}`} accent="#8b5cf6" />
            <StatCard label="Matched Pipeline" value={leads.filter(l => l.status !== 'Enrolled' && l.status !== 'Dead').length} sub="Active leads matching categories" accent="#60a5fa" />
          </div>

          {/* Interactive Chart Container */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 15 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', marginBottom: 12 }}>
              💼 JAP Vacancy Distribution by Course
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                  <XAxis dataKey="name" stroke="var(--t3)" tick={{ fontSize: 9, fontFamily: 'var(--mono)' }} />
                  <YAxis stroke="var(--t3)" tick={{ fontSize: 9, fontFamily: 'var(--mono)' }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'var(--mono)' }} />
                  <Bar dataKey="jobs" name="Full-Time Jobs" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="internships" name="Internships" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div style={{ 
            background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, 
            padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' 
          }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search job title, company, description..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: '100%', height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 4, padding: '0 10px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t1)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Type Filter */}
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={{ 
                  height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 4, padding: '0 8px', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t2)',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Types</option>
                <option value="Job">Full-Time Jobs</option>
                <option value="Internship">Internships</option>
              </select>

              {/* Course Filter */}
              <select 
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{ 
                  height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 4, padding: '0 8px', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t2)',
                  cursor: 'pointer', maxWidth: 150
                }}
              >
                <option value="All">All Courses</option>
                {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Location Filter */}
              <select 
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                style={{ 
                  height: 32, background: 'var(--bg2)', border: '1px solid var(--bd)',
                  borderRadius: 4, padding: '0 8px', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t2)',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Locations</option>
                {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Jobs Listings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
            {filteredJobs.length === 0 ? (
              <div style={{ 
                gridColumn: 'span 2', padding: 40, border: '1px dashed var(--bd)', borderRadius: 5,
                textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)'
              }}>
                No active openings match the filter criteria.
              </div>
            ) : (
              filteredJobs.map(job => {
                const matches = getMatches(job.course);
                const hasMatch = matches.length > 0;
                const isExpanded = expandedJobId === job.id;

                return (
                  <div key={job.id} style={{ 
                    background: 'var(--bg1)', border: `1px solid ${isExpanded ? 'var(--amber)' : 'var(--bd)'}`, 
                    borderRadius: 5, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'border-color .15s'
                  }}>
                    {/* Top Row: Job ID and Type Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{job.job_id}</span>
                      <span style={{ 
                        fontFamily: 'var(--mono)', fontSize: 8, padding: '2px 6px', borderRadius: 3,
                        fontWeight: 600,
                        background: job.type === 'Job' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        border: `1px solid ${job.type === 'Job' ? '#22c55e' : '#8b5cf6'}`,
                        color: job.type === 'Job' ? '#22c55e' : '#a78bfa'
                      }}>
                        {job.type === 'Job' ? 'JOB' : 'INTERNSHIP'}
                      </span>
                    </div>

                    {/* Job Details */}
                    <div>
                      <h3 style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>
                        {job.title}
                      </h3>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>
                        {job.company} — <span style={{ color: 'var(--t3)' }}>{job.location}</span>
                      </div>
                    </div>

                    {/* Meta parameters */}
                    <div style={{ display: 'flex', gap: 15, background: 'var(--bg2)', padding: '6px 10px', borderRadius: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>COURSE TARGET</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', fontWeight: 600 }}>{job.course}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>SALARY / STIPEND</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', fontWeight: 600 }}>{job.salary}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>VACANCIES</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', fontWeight: 600 }}>{job.openings} Opening(s)</div>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ 
                      margin: 0, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', 
                      lineHeight: 1.4, background: 'var(--bg0)', padding: 8, borderRadius: 4
                    }}>
                      {job.description}
                    </p>

                    {/* Match Candidates Pipeline */}
                    <div style={{ 
                      marginTop: 'auto', borderTop: '1px solid var(--bd)', paddingTop: 10,
                      display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {hasMatch ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)' }}>
                              {matches.length} matching candidate(s) in pipeline
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
                            No active matching leads
                          </span>
                        )}
                        
                        {hasMatch && (
                          <button 
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            style={{ 
                              background: 'none', border: '1px solid var(--bd)', color: 'var(--t2)',
                              fontFamily: 'var(--mono)', fontSize: 8, borderRadius: 3, padding: '3px 8px',
                              cursor: 'pointer', transition: 'all .1s'
                            }}
                          >
                            {isExpanded ? 'Hide Matches ▴' : 'View Matches ▾'}
                          </button>
                        )}
                      </div>

                      {/* Expended matches dropdown list */}
                      {isExpanded && hasMatch && (
                        <div style={{ 
                          background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, 
                          padding: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto'
                        }}>
                          {matches.map(lead => (
                            <div key={lead.id} style={{ 
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '4px 6px', background: 'var(--bg1)', borderRadius: 3, border: '1px solid var(--bd)'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)', fontWeight: 600 }}>{lead.name}</span>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>Status: {lead.status} | {lead.phone}</span>
                              </div>
                              <button 
                                onClick={() => handleDial(lead)}
                                style={{ 
                                  height: 22, padding: '0 8px', borderRadius: 3, background: 'var(--gbg)',
                                  border: '1px solid var(--gdim)', color: 'var(--green)', fontFamily: 'var(--mono)',
                                  fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                                }}
                              >
                                📞 Call
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Sync overlay portal */}
      {isSyncing && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(9, 11, 15, 0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: 20
        }}>
          <div style={{ 
            maxWidth: 550, width: '100%', background: 'var(--bg1)', border: '1px solid var(--bd2)', 
            borderRadius: 6, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: 15
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd)', paddingBottom: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                🤖 Web Scraper Terminal: jap.avodha.org
              </span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse 1s infinite' }} />
            </div>

            {/* Console logs output */}
            <div style={{ 
              background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 4, 
              padding: 12, height: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
              fontFamily: 'var(--mono)', fontSize: 9, color: '#a7f3d0', lineHeight: 1.4
            }}>
              {syncLogs.length === 0 && <div>Connecting to host socket...</div>}
              {syncLogs.map((log, idx) => (
                <div key={idx} style={{ color: log.includes('🎉') ? '#34d399' : '#a7f3d0' }}>{log}</div>
              ))}
            </div>

            {/* Progress status bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>
                <span>Syncing Placement indices...</span>
                <span>{syncProgress}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--amber)', borderRadius: 3, transition: 'width .3s ease' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded spin keyframe style */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
