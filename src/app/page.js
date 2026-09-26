'use client';

import { useState, useEffect } from 'react';
import { getEventCategories } from '@/lib/eventUtils';

function RefreshCountdown({ deadline }) {
  const [remainingMs, setRemainingMs] = useState(15000);

  useEffect(() => {
    if (!deadline) return;

    const updateCountdown = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    updateCountdown();
    const timer = setInterval(updateCountdown, 50);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <p style={{ color: '#f87171', fontSize: '1.15rem', fontWeight: 700, margin: '-1rem 0 2rem' }}>
      Next refresh in {Math.ceil(remainingMs / 1000)}s
    </p>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshDeadline, setRefreshDeadline] = useState(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'mekhala', 'parish', 'search'
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mekhalaSearch, setMekhalaSearch] = useState('');
  const [parishSearch, setParishSearch] = useState('');
  const [parishMekhalaFilter, setParishMekhalaFilter] = useState('ALL');

  async function loadResults() {
    try {
      const res = await fetch('/api/results', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRefreshDeadline(Date.now() + 15000);
    loadResults();
    const interval = setInterval(() => {
      setRefreshDeadline(Date.now() + 15000);
      loadResults();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 1.5s infinite linear' }}>
          ⏳
        </div>
        <h2 style={{ color: '#fff', fontFamily: 'var(--font-heading)' }}>Loading Live Fest Results...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Connecting to CMLResult database</p>
      </div>
    );
  }

  const { events = [], topMekhalas = [], topParishes = [], stats = {} } = data || {};
  const hasPublishedResults = Boolean(stats.hasPublishedResults);

  // Filter events
  const filteredEvents = events.filter(ev => {
    const matchesEvent = selectedEventFilter === 'ALL' || ev.name === selectedEventFilter;
    const evCats = getEventCategories(ev);
    const matchesCategory = selectedCategoryFilter === 'ALL' || evCats.includes(selectedCategoryFilter) || ev.category === selectedCategoryFilter;
    const matchesSearch = !searchQuery || 
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.candidates?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.chestNo && c.chestNo.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesEvent && matchesCategory && matchesSearch;
  });

  // Filter Mekhalas
  const filteredTopMekhalas = topMekhalas.filter(m => {
    if (!mekhalaSearch.trim()) return true;
    const q = mekhalaSearch.toLowerCase();
    return m.name.toLowerCase().includes(q);
  });

  // Unique Mekhalas for Parish filter
  const uniqueMekhalas = Array.from(new Set(topParishes.map(s => s.mekhala).filter(Boolean)));

  // Filter Parishes
  const filteredTopParishes = topParishes.filter(s => {
    const matchesMekhala = parishMekhalaFilter === 'ALL' || s.mekhala === parishMekhalaFilter;
    if (!matchesMekhala) return false;
    if (!parishSearch.trim()) return true;
    const q = parishSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.mekhala && s.mekhala.toLowerCase().includes(q));
  });

  // Extract all unique individual categories
  const categories = Array.from(new Set(events.flatMap(e => getEventCategories(e)))).filter(Boolean);

  // Ongoing events for the live section
  const ongoingEvents = events.filter(ev => ev.status === 'Ongoing');

  // Candidate Search results across all events
  const allCandidates = events.flatMap(e => e.candidates || []);
  const searchedCandidates = searchQuery.trim() !== '' 
    ? allCandidates.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.chestNo && c.chestNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.houseName && c.houseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.parish?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mekhala?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div className="hero-section">
        <div className="hero-pill">
          <span>🏆</span> Live Festival Results
        </div>
        <h1 className="hero-title">Festival Results & Leaderboard</h1>
        <RefreshCountdown deadline={refreshDeadline} />
      </div>

      {/* Top Stats Overview */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">Total Candidates</span>
          <span className="stat-value">{stats.totalCandidates || 0}</span>
          <span className="stat-sub">Across all registered events</span>
        </div>

        <div className="glass-panel stat-card purple">
          <span className="stat-label">Events Status</span>
          <span className="stat-value">
            {stats.completedEvents || 0} / {stats.totalEvents || 0}
          </span>
          <span className="stat-sub">
            {ongoingEvents.length > 0 ? `${ongoingEvents.length} ongoing now • ` : ''}
            Events with results published
          </span>
        </div>

        <div className="glass-panel stat-card gold">
          <span className="stat-label">Leading Mekhala</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>
            {stats.leadingMekhala ? stats.leadingMekhala.name : '—'}
          </span>
          <span className="stat-sub">
            {stats.leadingMekhala ? `${stats.leadingMekhala.totalPoints} Total Points` : 'Awaiting results'}
          </span>
        </div>

        <div className="glass-panel stat-card emerald">
          <span className="stat-label">Leading Parish</span>
          <span className="stat-value" style={{ color: '#34d399' }}>
            {stats.leadingParish ? stats.leadingParish.name : '—'}
          </span>
          <span className="stat-sub">
            {stats.leadingParish ? `${stats.leadingParish.totalPoints} Total Points` : 'Awaiting results'}
          </span>
        </div>
      </div>

      {/* ONGOING EVENTS LIVE SECTION */}
      {ongoingEvents.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-full)',
              padding: '0.3rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#f87171',
              animation: 'pulse 2s infinite',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
              LIVE NOW
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Ongoing Events ({ongoingEvents.length})
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {ongoingEvents.map(ev => (
              <div key={ev._id || ev.name} style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(30,20,40,0.6))',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.15rem 1.25rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Pulsing top edge line */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #ef4444, #f97316)',
                  borderRadius: '4px 4px 0 0',
                }} />

                {/* Event name */}
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.5rem', paddingRight: '0.5rem' }}>
                  {ev.name}
                </div>

                {/* Stage info */}
                {ev.stageNumber && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(251, 191, 36, 0.12)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#fbbf24',
                    marginBottom: '0.5rem',
                  }}>
                    🏁 Stage {ev.stageNumber}{ev.stageDescription ? ` — ${ev.stageDescription}` : ''}
                  </div>
                )}

                {/* Category badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                  {getEventCategories(ev).map((cat, i) => (
                    <span key={i} className="event-category-badge" style={{ fontSize: '0.72rem' }}>{cat}</span>
                  ))}
                  <span style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}>
                    {ev.gender === 'Both' || !ev.gender ? '♀️♂️ Both' : ev.gender}
                  </span>
                </div>

                {/* Candidate count */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  👤 {ev.candidates?.length || 0} participants
                  {ev.description && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>• {ev.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="tabs-nav">
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          🎪 Results By Event
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'mekhala' ? 'active' : ''}`}
          onClick={() => setActiveTab('mekhala')}
        >
          🥇 Top Mekhala Leaderboard
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'parish' ? 'active' : ''}`}
          onClick={() => setActiveTab('parish')}
        >
          🏢 Top Parish Leaderboard
        </button>
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Candidate Search
        </button>
      </div>

      {/* TAB 1: RESULTS BY EVENT */}
      {activeTab === 'events' && (
        <div>
          {/* Filters Bar */}
          <div className="filter-bar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Search event, candidate name, or chest no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
              >
                <option value="ALL">All Events</option>
                {events.map(ev => (
                  <option key={ev.name} value={ev.name}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="glass-panel empty-state">
              <div className="empty-icon">🎪</div>
              <h3>No events match your criteria</h3>
              <p>Try clearing your search or add events via the Admin panel.</p>
            </div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map(event => {
                const firstWinners = event.winners?.first || [];
                const secondWinners = event.winners?.second || [];
                const thirdWinners = event.winners?.third || [];
                const hasWinners = firstWinners.length > 0 || secondWinners.length > 0 || thirdWinners.length > 0;

                return (
                  <div key={event._id || event.name} className="glass-panel event-card">
                    <div className="event-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={`event-status ${
                            event.status === 'Completed' ? 'completed' : event.status === 'In Progress' ? 'progress' : 'upcoming'
                          }`}>
                            ● {event.status || 'Upcoming'}
                          </span>
                          <span className="event-category-badge">{event.category || 'General'}</span>
                        </div>
                        <h3 className="event-title">{event.name}</h3>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {event.candidates?.length || 0} participants
                      </div>
                    </div>

                    {event.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {event.description}
                      </p>
                    )}

                    {/* Point Scheme Indicator */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <span>🥇 1st: {event.points?.first ?? 5}pts</span>
                      <span>🥈 2nd: {event.points?.second ?? 3}pts</span>
                      <span>🥉 3rd: {event.points?.third ?? 1}pts</span>
                      <span>⭐ A: {event.points?.gradeA ?? 5}pts</span>
                    </div>

                    {/* Winners or Standings */}
                    <div className="winners-list">
                      {hasWinners ? (
                        <>
                          {/* 1st Place */}
                          {firstWinners.map(cand => (
                            <div key={cand._id || cand.name} className="winner-row first-place">
                              <div className="winner-info">
                                <span className="place-tag">🥇</span>
                                <div>
                                  <div className="winner-name">
                                    {cand.name} <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>({cand.chestNo})</span>
                                  </div>
                                  <div className="winner-sub">
                                    {cand.parish} • {cand.mekhala}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="points-pill">+{cand.totalPoints} pts</span>
                                {cand.grade && cand.grade !== 'None' && (
                                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                                    Grade {cand.grade}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* 2nd Place */}
                          {secondWinners.map(cand => (
                            <div key={cand._id || cand.name} className="winner-row second-place">
                              <div className="winner-info">
                                <span className="place-tag">🥈</span>
                                <div>
                                  <div className="winner-name">
                                    {cand.name} <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>({cand.chestNo})</span>
                                  </div>
                                  <div className="winner-sub">
                                    {cand.parish} • {cand.mekhala}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="points-pill">+{cand.totalPoints} pts</span>
                                {cand.grade && cand.grade !== 'None' && (
                                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                                    Grade {cand.grade}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* 3rd Place */}
                          {thirdWinners.map(cand => (
                            <div key={cand._id || cand.name} className="winner-row third-place">
                              <div className="winner-info">
                                <span className="place-tag">🥉</span>
                                <div>
                                  <div className="winner-name">
                                    {cand.name} <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>({cand.chestNo})</span>
                                  </div>
                                  <div className="winner-sub">
                                    {cand.parish} • {cand.mekhala}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="points-pill">+{cand.totalPoints} pts</span>
                                {cand.grade && cand.grade !== 'None' && (
                                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                                    Grade {cand.grade}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: '1.5rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-muted)',
                          fontSize: '0.9rem',
                        }}>
                          ⏳ Results not published yet
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOP MEKHALA LEADERBOARD */}
      {activeTab === 'mekhala' && (
        <div>
          {/* Podium Top 3 */}
          {hasPublishedResults && topMekhalas.length >= 2 && (
            <div className="podium-container">
              {/* 2nd Place */}
              {topMekhalas[1] && (
                <div className="podium-step second">
                  <div className="podium-badge">🥈</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--silver)', fontWeight: 600 }}>RUNNER-UP</div>
                    <div className="podium-name">{topMekhalas[1].name}</div>
                    <div className="podium-points">{topMekhalas[1].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topMekhalas[1].firsts}</span>
                      <span>🥈 {topMekhalas[1].seconds}</span>
                      <span>🥉 {topMekhalas[1].thirds}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topMekhalas[0] && (
                <div className="podium-step first">
                  <div className="podium-badge">👑</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 700 }}>CHAMPION</div>
                    <div className="podium-name" style={{ fontSize: '1.4rem' }}>{topMekhalas[0].name}</div>
                    <div className="podium-points" style={{ color: '#fbbf24' }}>{topMekhalas[0].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topMekhalas[0].firsts}</span>
                      <span>🥈 {topMekhalas[0].seconds}</span>
                      <span>🥉 {topMekhalas[0].thirds}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topMekhalas[2] && (
                <div className="podium-step third">
                  <div className="podium-badge">🥉</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--bronze)', fontWeight: 600 }}>THIRD PLACE</div>
                    <div className="podium-name">{topMekhalas[2].name}</div>
                    <div className="podium-points">{topMekhalas[2].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topMekhalas[2].firsts}</span>
                      <span>🥈 {topMekhalas[2].seconds}</span>
                      <span>🥉 {topMekhalas[2].thirds}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mekhala Search Bar */}
          <div className="filter-bar" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="search-box" style={{ flex: 1 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search mekhala by name..."
                className="form-input"
                value={mekhalaSearch}
                onChange={(e) => setMekhalaSearch(e.target.value)}
              />
            </div>
            {mekhalaSearch && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMekhalaSearch('')}
              >
                Clear
              </button>
            )}
          </div>

          {/* Full Table */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Mekhala Name</th>
                  <th>Parishes</th>
                  <th>Candidates</th>
                  <th>🥇 1st</th>
                  <th>🥈 2nd</th>
                  <th>🥉 3rd</th>
                  <th>⭐ Grade A/B/C</th>
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {!hasPublishedResults ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Mekhala standings will appear after results are published.
                    </td>
                  </tr>
                ) : filteredTopMekhalas.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No mekhalas match your search "{mekhalaSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredTopMekhalas.map(m => (
                    <tr key={m.name}>
                      <td>
                        <span className={`rank-pill ${
                          m.rank === 1 ? 'rank-1' : m.rank === 2 ? 'rank-2' : m.rank === 3 ? 'rank-3' : ''
                        }`}>
                          {m.rank}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{m.name}</strong>
                      </td>
                      <td>{m.parishCount}</td>
                      <td>{m.candidateCount}</td>
                      <td><span style={{ color: '#fbbf24', fontWeight: 600 }}>{m.firsts}</span></td>
                      <td><span style={{ color: '#cbd5e1', fontWeight: 600 }}>{m.seconds}</span></td>
                      <td><span style={{ color: '#d97706', fontWeight: 600 }}>{m.thirds}</span></td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {m.gradeA} / {m.gradeB} / {m.gradeC}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-heading)',
                          color: m.rank === 1 ? '#fbbf24' : 'var(--accent-cyan)'
                        }}>
                          {m.totalPoints}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TOP PARISH LEADERBOARD */}
      {activeTab === 'parish' && (
        <div>
          {/* Podium Top 3 */}
          {hasPublishedResults && topParishes.length >= 2 && (
            <div className="podium-container">
              {/* 2nd Place */}
              {topParishes[1] && (
                <div className="podium-step second">
                  <div className="podium-badge">🥈</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--silver)', fontWeight: 600 }}>RUNNER-UP</div>
                    <div className="podium-name">{topParishes[1].name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{topParishes[1].mekhala}</div>
                    <div className="podium-points">{topParishes[1].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topParishes[1].firsts}</span>
                      <span>🥈 {topParishes[1].seconds}</span>
                      <span>🥉 {topParishes[1].thirds}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topParishes[0] && (
                <div className="podium-step first">
                  <div className="podium-badge">👑</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 700 }}>CHAMPION PARISH</div>
                    <div className="podium-name" style={{ fontSize: '1.4rem' }}>{topParishes[0].name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{topParishes[0].mekhala}</div>
                    <div className="podium-points" style={{ color: '#fbbf24' }}>{topParishes[0].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topParishes[0].firsts}</span>
                      <span>🥈 {topParishes[0].seconds}</span>
                      <span>🥉 {topParishes[0].thirds}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topParishes[2] && (
                <div className="podium-step third">
                  <div className="podium-badge">🥉</div>
                  <div className="podium-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--bronze)', fontWeight: 600 }}>THIRD PLACE</div>
                    <div className="podium-name">{topParishes[2].name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{topParishes[2].mekhala}</div>
                    <div className="podium-points">{topParishes[2].totalPoints} <span style={{ fontSize: '1rem' }}>PTS</span></div>
                    <div className="podium-meta">
                      <span>🥇 {topParishes[2].firsts}</span>
                      <span>🥈 {topParishes[2].seconds}</span>
                      <span>🥉 {topParishes[2].thirds}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parish Search & Filter Bar */}
          <div className="filter-bar" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search parish by name or parent mekhala..."
                className="form-input"
                value={parishSearch}
                onChange={(e) => setParishSearch(e.target.value)}
              />
            </div>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={parishMekhalaFilter}
              onChange={(e) => setParishMekhalaFilter(e.target.value)}
            >
              <option value="ALL">All Mekhalas</option>
              {uniqueMekhalas.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {(parishSearch || parishMekhalaFilter !== 'ALL') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setParishSearch('');
                  setParishMekhalaFilter('ALL');
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Full Parish Table */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Parish Name</th>
                  <th>Parent Mekhala</th>
                  <th>Candidates</th>
                  <th>🥇 1st</th>
                  <th>🥈 2nd</th>
                  <th>🥉 3rd</th>
                  <th>⭐ Grade A/B/C</th>
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {!hasPublishedResults ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Parish standings will appear after results are published.
                    </td>
                  </tr>
                ) : filteredTopParishes.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No parishes match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredTopParishes.map(s => (
                    <tr key={s.name}>
                      <td>
                        <span className={`rank-pill ${
                          s.rank === 1 ? 'rank-1' : s.rank === 2 ? 'rank-2' : s.rank === 3 ? 'rank-3' : ''
                        }`}>
                          {s.rank}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{s.name}</strong>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          fontSize: '0.85rem'
                        }}>
                          {s.mekhala}
                        </span>
                      </td>
                      <td>{s.candidateCount}</td>
                      <td><span style={{ color: '#fbbf24', fontWeight: 600 }}>{s.firsts}</span></td>
                      <td><span style={{ color: '#cbd5e1', fontWeight: 600 }}>{s.seconds}</span></td>
                      <td><span style={{ color: '#d97706', fontWeight: 600 }}>{s.thirds}</span></td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {s.gradeA} / {s.gradeB} / {s.gradeC}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-heading)',
                          color: s.rank === 1 ? '#fbbf24' : 'var(--accent-cyan)'
                        }}>
                          {s.totalPoints}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CANDIDATE SEARCH */}
      {activeTab === 'search' && (
        <div>
          <div className="filter-bar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Type chest number (e.g. CML-101) or candidate name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {searchQuery.trim() === '' ? (
            <div className="glass-panel empty-state">
              <div className="empty-icon">🔎</div>
              <h3>Search Any Candidate</h3>
              <p>Enter a candidate name or chest number above to inspect individual scorecards and results.</p>
            </div>
          ) : searchedCandidates.length === 0 ? (
            <div className="glass-panel empty-state">
              <div className="empty-icon">🚫</div>
              <h3>No candidates found matching "{searchQuery}"</h3>
              <p>Check the spelling or chest number and try again.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {searchedCandidates.map(cand => (
                <div key={cand._id || cand.name} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      color: 'var(--accent-cyan)',
                      fontSize: '1.1rem',
                      letterSpacing: '0.05em'
                    }}>
                      {cand.chestNo}
                    </span>
                    <span className="points-pill">
                      {cand.totalPoints || 0} Points
                    </span>
                  </div>

                  <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{cand.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {cand.houseName} • {cand.sex} • Section: {cand.section}
                    {cand.phone && ` • 📞 ${cand.phone}`}
                  </p>

                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div>🎪 <strong>Event:</strong> {cand.event}</div>
                    <div>📍 <strong>Mekhala:</strong> {cand.mekhala}</div>
                    <div>🏢 <strong>Parish:</strong> {cand.parish}</div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                      <span>🏆 Position: <strong style={{ color: '#fff' }}>{cand.position || 'None'}</strong></span>
                      <span>⭐ Grade: <strong style={{ color: '#fbbf24' }}>{cand.grade || 'None'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
