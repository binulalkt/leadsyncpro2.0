import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { getJapJobs, saveJapJobs } from '../db';

export default function JAPJobs() {
  const { leads, japJobs, setJapJobs, lastJobsSync, setLastJobsSync } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial jobs on mount if store is empty
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

  // Helper to parse date differences based on local time context (June 14, 2026)
  const getDaysDiff = (dueDateStr) => {
    if (!dueDateStr) return null;
    const parts = dueDateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    
    const dueDate = new Date(year, month, day);
    const today = new Date(2026, 5, 14); // June 14, 2026 (System Context time)
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Parser for raw text copy-pasted from jap.avodha.org
  const handleParseAndSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!pasteText.trim()) {
      setErrorMsg('Please paste raw table content in the input field.');
      return;
    }

    try {
      const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l !== '');
      const parsedJobs = [];
      let headerIndices = null;

      // Scan first 3 lines to see if there is a header row
      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        const parts = lines[i].split(/\t+/);
        if (parts.length >= 4 && parts.some(p => p.toLowerCase().includes('course') || p.toLowerCase().includes('job id'))) {
          headerIndices = {};
          parts.forEach((part, index) => {
            const p = part.toLowerCase();
            if (p.includes('sl') || p.includes('no')) headerIndices['sl_no'] = index;
            else if (p.includes('course')) headerIndices['course'] = index;
            else if (p.includes('category')) headerIndices['category'] = index;
            else if (p.includes('mode')) headerIndices['mode'] = index;
            else if (p.includes('job') || p.includes('id')) headerIndices['job_id'] = index;
            else if (p.includes('due') || p.includes('date')) headerIndices['due_date'] = index;
            else if (p.includes('gender')) headerIndices['gender'] = index;
            else if (p.includes('location')) headerIndices['location'] = index;
          });
          lines.splice(i, 1); // Remove header line
          break;
        }
      }

      // Process lines
      lines.forEach((line) => {
        let parts = line.split('\t');
        if (parts.length < 4) {
          parts = line.split(/\s{2,}/); // Try split by double or more spaces
        }

        if (parts.length >= 4) {
          let job_id = '';
          let course = '';
          let category = 'Job';
          let mode = 'Work at Office';
          let due_date = '';
          let gender = 'Both';
          let location = 'UNKNOWN';

          if (headerIndices) {
            job_id = parts[headerIndices['job_id']] || '';
            course = parts[headerIndices['course']] || '';
            category = parts[headerIndices['category']] || '';
            mode = parts[headerIndices['mode']] || '';
            due_date = parts[headerIndices['due_date']] || '';
            gender = parts[headerIndices['gender']] || '';
            location = parts[headerIndices['location']] || '';
          } else {
            // Guessed order based on standard representation:
            // e.g. Sl.No | Course | Category | Mode | Job ID | Due Date | Gender | Location
            // 1  Flutter in Malayalam  Internship  Work at Office  23257  15/06/2026  Both  KOTTAYAM
            if (parts.length === 8) {
              course = parts[1];
              category = parts[2];
              mode = parts[3];
              job_id = parts[4];
              due_date = parts[5];
              gender = parts[6];
              location = parts[7];
            } else if (parts.length === 7) {
              // If sl_no is missing
              course = parts[0];
              category = parts[1];
              mode = parts[2];
              job_id = parts[3];
              due_date = parts[4];
              gender = parts[5];
              location = parts[6];
            } else {
              // Fallback guesser
              course = parts[0] || 'Unknown Course';
              category = parts[1] || 'Job';
              mode = parts[2] || 'Work at Office';
              job_id = parts[3] || 'JAP-' + Math.floor(Math.random() * 10000);
              due_date = parts[4] || '';
              gender = parts[5] || 'Both';
              location = parts[6] || 'UNKNOWN';
            }
          }

          if (job_id && course) {
            parsedJobs.push({
              job_id: job_id.trim(),
              title: course.trim(),
              course: course.trim(),
              category: category.trim(),
              mode: mode.trim(),
              due_date: due_date.trim(),
              gender: gender.trim(),
              location: location.trim().toUpperCase(),
              company: "Avodha Partner Firm",
              salary: mode.trim().toLowerCase().includes('office') ? "Salary / Stipend (WFO)" : "Salary / Stipend (WFH)",
              description: `Opportunities in ${course.trim()} matching counselor pipeline. Mode: ${mode.trim()}. Target Gender: ${gender.trim()}.`,
              postedDate: new Date()
            });
          }
        }
      });

      if (parsedJobs.length === 0) {
        setErrorMsg('Could not parse any listings. Check format (Tab-separated values are preferred).');
        return;
      }

      setLoading(true);
      const updatedJobs = await saveJapJobs(parsedJobs);
      setJapJobs(updatedJobs);
      setLastJobsSync(new Date());
      setPasteText('');
      setSuccessMsg(`Successfully parsed and loaded ${parsedJobs.length} active opportunities from jap.avodha.org!`);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process and save database elements: ' + err.message);
      setLoading(false);
    }
  };

  // Dashboard Aggregated Stats
  const dashboardStats = useMemo(() => {
    // Opportunities count per location
    const locationCounts = {};
    let internshipCount = 0;
    let directJobCount = 0;
    let wfoCount = 0;
    let wfhCount = 0;
    let expiringTomorrowCount = 0;

    japJobs.forEach(job => {
      // Location Opportunity Counts
      const loc = (job.location || 'UNKNOWN').toUpperCase();
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;

      // Category breakdown
      const cat = (job.category || job.type || 'Job').toLowerCase();
      if (cat.includes('internship')) {
        internshipCount++;
      } else {
        directJobCount++;
      }

      // Mode breakdown
      const md = (job.mode || 'Work at Office').toLowerCase();
      if (md.includes('office') || md.includes('wfo') || md.includes('onsite') || md.includes('on-site')) {
        wfoCount++;
      } else {
        wfhCount++;
      }

      // Expiry tracking (Expiring Tomorrow = diff is exactly 1 day)
      const diff = getDaysDiff(job.due_date);
      if (diff === 1) {
        expiringTomorrowCount++;
      }
    });

    return {
      locations: locationCounts,
      internships: internshipCount,
      directJobs: directJobCount,
      wfo: wfoCount,
      wfh: wfhCount,
      expiringTomorrow: expiringTomorrowCount
    };
  }, [japJobs]);

  // Filter listings
  const filteredJobs = useMemo(() => {
    return japJobs.filter(j => {
      if (search === '') return true;
      const term = search.toLowerCase();
      const title = (j.title || '').toLowerCase();
      const jobId = (j.job_id || '').toLowerCase();
      const location = (j.location || '').toLowerCase();
      const mode = (j.mode || '').toLowerCase();
      const category = (j.category || j.type || '').toLowerCase();

      return title.includes(term) ||
        jobId.includes(term) ||
        location.includes(term) ||
        mode.includes(term) ||
        category.includes(term);
    });
  }, [japJobs, search]);

  // Lead-matching candidates helper
  const getMatches = (courseName) => {
    // Match based on course name contains or exact match
    return leads.filter(l => {
      if (l.status === 'Enrolled' || l.status === 'Dead') return false;
      const leadCourse = (l.course || '').toLowerCase();
      const jobCourse = courseName.toLowerCase();
      
      // Allow fuzzy matching on course names (e.g. "Flutter" matches "Flutter in Malayalam")
      return jobCourse.includes(leadCourse) || leadCourse.includes(jobCourse);
    });
  };

  const handleDial = (lead) => {
    window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg0)', padding: isMobile ? 12 : 20, gap: 16 }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--bd)', paddingBottom: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 'bold', color: 'var(--t0)', margin: 0 }}>JAP Portal Scraper</h2>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>
            Parse and analyze copy-pasted data from jap.avodha.org
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
          Active Dataset: {japJobs.length} listing(s) | Last Synced: {lastJobsSync ? lastJobsSync.toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Main Grid: Statistics & Import Form */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 16 }}>
        
        {/* Dashboard Statistics Widget */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            📊 Placement Analytics Dashboard
          </div>

          {/* Locations Opportunities summary */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.keys(dashboardStats.locations).length === 0 ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>No locations detected. Import data below.</div>
            ) : (
              Object.entries(dashboardStats.locations).map(([loc, count]) => (
                <div key={loc} style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: '8px 12px', minWidth: 100 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>LOCATION</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 'bold', color: 'var(--t0)', marginTop: 2 }}>{loc}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)', marginTop: 3 }}>{count} Opportunity(ies)</div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 5 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>CATEGORIES</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)', fontWeight: 600, marginTop: 4 }}>
                {dashboardStats.internships} Internship(s)<br/>
                {dashboardStats.directJobs} Direct Job(s)
              </div>
            </div>
            
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>WORKING MODE</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)', fontWeight: 600, marginTop: 4 }}>
                {dashboardStats.wfo} WFO (Office)<br/>
                {dashboardStats.wfh} WFH (Home)
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, padding: 10, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: dashboardStats.expiringTomorrow > 0 ? 'var(--red)' : 'var(--bd)' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>CRITICAL DEADLINES</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: dashboardStats.expiringTomorrow > 0 ? 'var(--red)' : 'var(--t1)', fontWeight: 600, marginTop: 4 }}>
                {dashboardStats.expiringTomorrow} expiring tomorrow
              </div>
            </div>
          </div>
        </div>

        {/* Input Textarea to Paste avodha JAP table */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', fontWeight: 'bold' }}>
            📥 Import actual JAP Portal data
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', lineHeight: 1.3 }}>
            Copy the table text from <strong style={{ color: 'var(--amber)' }}>jap.avodha.org</strong> and paste it directly below:
          </div>
          
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Example format:&#10;Sl.No	Course	Category	Mode	Job ID	Due Date	Gender	Location&#10;1	Flutter in Malayalam	Internship	Work at Office	23257	15/06/2026	Both	KOTTAYAM"
            style={{ 
              flex: 1, minHeight: 90, background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 4, padding: 8, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t1)',
              resize: 'vertical', boxSizing: 'border-box'
            }}
          />

          <button
            onClick={handleParseAndSave}
            disabled={loading}
            style={{ 
              height: 32, background: 'var(--gbg)', border: '1px solid var(--gdim)', color: 'var(--green)',
              borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--gdim)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--gbg)'}
          >
            {loading ? 'Processing Database...' : '⚡ PARSE & SAVE ACTIVE LISTINGS'}
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div style={{ background: 'var(--gbg)', border: '1px solid var(--gdim)', borderRadius: 4, padding: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rdim)', borderRadius: 4, padding: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* Search Filter Panel */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg1)', border: '1px solid var(--bd)', borderRadius: 5, padding: '10px 14px' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginRight: 10 }}>FILTER LISTING:</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by location, course name, Job ID, mode..."
          style={{ 
            flex: 1, height: 28, background: 'var(--bg2)', border: '1px solid var(--bd)',
            borderRadius: 4, padding: '0 8px', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t1)'
          }}
        />
      </div>

      {/* Opportunities Card Listings */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
        {filteredJobs.length === 0 ? (
          <div style={{ 
            gridColumn: 'span 2', padding: 30, border: '1px dashed var(--bd)', borderRadius: 5,
            textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)'
          }}>
            No matching openings found.
          </div>
        ) : (
          filteredJobs.map(job => {
            const matches = getMatches(job.course);
            const hasMatch = matches.length > 0;
            const isExpanded = expandedJobId === job.id;
            const daysLeft = getDaysDiff(job.due_date);

            const jobCategory = job.category || job.type || 'Job';
            const jobMode = job.mode || 'Work at Office';
            const jobGender = job.gender || 'Both';
            const jobLocation = job.location || 'UNKNOWN';
            const isInternship = jobCategory.toLowerCase().includes('internship');
            
            let deadlineText = job.due_date ? `Due Date: ${job.due_date}` : 'No deadline';
            let deadlineColor = 'var(--t3)';
            if (daysLeft === 1) {
              deadlineText = `⚠ Expiring Tomorrow (${job.due_date})`;
              deadlineColor = 'var(--red)';
            } else if (daysLeft === 0) {
              deadlineText = `⚠ Expiring Today (${job.due_date})`;
              deadlineColor = 'var(--red)';
            } else if (daysLeft < 0) {
              deadlineText = `Expired (${job.due_date})`;
              deadlineColor = 'var(--t3)';
            }

            return (
              <div key={job.id} style={{ 
                background: 'var(--bg1)', border: `1px solid ${isExpanded ? 'var(--amber)' : 'var(--bd)'}`,
                borderRadius: 5, padding: 12, display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Job ID: {job.job_id}</span>
                  <span style={{ 
                    fontFamily: 'var(--mono)', fontSize: 8, padding: '1px 5px', borderRadius: 3,
                    background: isInternship ? 'rgba(139, 92, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    border: `1px solid ${isInternship ? '#8b5cf6' : '#22c55e'}`,
                    color: isInternship ? '#a78bfa' : '#22c55e'
                  }}>
                    {jobCategory.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>
                    {job.title}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 4 }}>
                    <span>📍 {jobLocation}</span>
                    <span>💼 {jobMode}</span>
                    <span>👤 Target: {jobGender}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', padding: '6px 10px', borderRadius: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: deadlineColor, fontWeight: 600 }}>
                    {deadlineText}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>
                    {job.company}
                  </span>
                </div>

                {/* Candidate Matching List */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--bd)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {hasMatch ? (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)' }}>
                        🟢 {matches.length} eligible student(s) in CRM
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)' }}>
                        No current leads matches this course
                      </span>
                    )}

                    {hasMatch && (
                      <button
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        style={{ 
                          background: 'none', border: '1px solid var(--bd)', color: 'var(--t2)',
                          fontFamily: 'var(--mono)', fontSize: 8, borderRadius: 3, padding: '2px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        {isExpanded ? 'Hide' : 'Quick Match'}
                      </button>
                    )}
                  </div>

                  {isExpanded && hasMatch && (
                    <div style={{ 
                      background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 4, 
                      padding: 6, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 120, overflowY: 'auto'
                    }}>
                      {matches.map(lead => (
                        <div key={lead.id} style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 6px', background: 'var(--bg1)', borderRadius: 3, border: '1px solid var(--bd)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t1)', fontWeight: 600 }}>{lead.name}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--t3)' }}>Status: {lead.status}</span>
                          </div>
                          <button
                            onClick={() => handleDial(lead)}
                            style={{ 
                              height: 20, padding: '0 6px', borderRadius: 3, background: 'var(--gbg)',
                              border: '1px solid var(--gdim)', color: 'var(--green)', fontFamily: 'var(--mono)',
                              fontSize: 8, cursor: 'pointer'
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

    </div>
  );
}
