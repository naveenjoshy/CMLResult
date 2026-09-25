'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SECTION_OPTIONS,
  GENDER_OPTIONS,
  isEventAvailableForSection,
  isEventAvailableForGender,
  isEventAvailableForCandidate,
  formatEventCategories,
  formatEventGender,
  getEventCategories,
  getSectionEventName,
} from '@/lib/eventUtils';
import PrintSheetModal from '@/components/PrintSheetModal';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('results'); // 'results', 'events', 'candidates', 'mekhala', 'sakha', 'db'

  // Print modal state
  const [printModalState, setPrintModalState] = useState({
    isOpen: false,
    type: 'stage', // 'stage' or 'result'
    event: null,
    candidates: [],
  });

  const openPrintModal = (type, eventObj, eventCandidates) => {
    setPrintModalState({
      isOpen: true,
      type,
      event: eventObj,
      candidates: eventCandidates || [],
    });
  };

  // Data states
  const [events, setEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [mekhalas, setMekhalas] = useState([]);
  const [sakhas, setSakhas] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Result entry state
  const [selectedEventName, setSelectedEventName] = useState('');

  // Event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    categories: ['Junior'],
    category: 'Junior',
    gender: 'Both',
    description: '',
    points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
    status: 'Upcoming',
    separateEvents: true,
  });

  // Event editing state
  const [editingEvent, setEditingEvent] = useState(null);

  // Mekhala & Sakha form states
  const [newMekhala, setNewMekhala] = useState({ name: '', code: '' });
  const [newSakha, setNewSakha] = useState({ name: '', mekhala: '' });

  // Candidate editing modal state
  const [editingCandidate, setEditingCandidate] = useState(null);

  // Candidate search/filter
  const [candidateSearch, setCandidateSearch] = useState('');
  const [mekhalaSearch, setMekhalaSearch] = useState('');
  const [sakhaSearch, setSakhaSearch] = useState('');
  const [sakhaMekhalaFilter, setSakhaMekhalaFilter] = useState('ALL');

  // Check login from sessionStorage on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('cml_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch all admin data
  async function fetchAllData() {
    setLoading(true);
    try {
      const [resE, resC, resM, resS, resD] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/candidates'),
        fetch('/api/mekhalas'),
        fetch('/api/sakhas'),
        fetch('/api/db-status'),
      ]);

      const dataE = await resE.json();
      const dataC = await resC.json();
      const dataM = await resM.json();
      const dataS = await resS.json();
      const dataD = await resD.json();

      if (dataE.success) {
        setEvents(dataE.data || []);
        if (dataE.data?.length > 0 && !selectedEventName) {
          setSelectedEventName(dataE.data[0].name);
        }
      }
      if (dataC.success) setCandidates(dataC.data || []);
      if (dataM.success) {
        setMekhalas(dataM.data || []);
        if (dataM.data?.length > 0 && !newSakha.mekhala) {
          setNewSakha(prev => ({ ...prev, mekhala: dataM.data[0].name }));
        }
      }
      if (dataS.success) setSakhas(dataS.data || []);
      if (dataD.success) setDbStatus(dataD);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Handle Admin PIN verification
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pinInput }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('cml_admin_auth', 'true');
      } else {
        setPinError(data.message || 'Invalid Password');
      }
    } catch (err) {
      setPinError('Failed to verify password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('cml_admin_auth');
  };

  // Notification helper
  const notify = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // 1. RESULT ENTRY: update candidate position & grade
  const handleResultChange = async (candidateId, field, value) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidateId, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        setCandidates(prev => prev.map(c => c._id === candidateId ? json.data : c));
        notify('success', 'Candidate result & points updated!');
      } else {
        notify('error', json.message || 'Failed to update result');
      }
    } catch (err) {
      notify('error', 'Network error updating result');
    }
  };

  // Change Event Status
  const handleEventStatusChange = async (eventId, newStatus) => {
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setEvents(prev => prev.map(e => e._id === eventId ? json.data : e));
        notify('success', `Event status set to ${newStatus}`);
      }
    } catch (err) {
      notify('error', 'Failed to update event status');
    }
  };

  // 2. ADD EVENT
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.name.trim()) {
      notify('error', 'Event name is required');
      return;
    }
    const cats = newEvent.categories || [];
    if (cats.length === 0) {
      notify('error', 'Please select at least one Category/Section');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          categories: cats,
          category: cats.join(', '),
          gender: newEvent.gender || 'Both',
          separateEvents: newEvent.separateEvents !== false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const addedList = Array.isArray(json.data) ? json.data : [json.data];
        setEvents(prev => [...addedList, ...prev]);
        notify(
          'success',
          addedList.length > 1
            ? `Successfully created ${addedList.length} events for ${cats.join(', ')}!`
            : `Event "${addedList[0]?.name || newEvent.name}" created successfully!`
        );
        setNewEvent({
          name: '',
          categories: ['Junior'],
          category: 'Junior',
          gender: 'Both',
          description: '',
          points: { first: 5, second: 3, third: 1, gradeA: 5, gradeB: 3, gradeC: 1 },
          status: 'Upcoming',
          separateEvents: true,
        });
      } else {
        notify('error', json.message || 'Failed to create event');
      }
    } catch (err) {
      notify('error', 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editingEvent.name.trim()) {
      notify('error', 'Event name is required');
      return;
    }
    const cats = editingEvent.categories || [];
    if (cats.length === 0) {
      notify('error', 'Please select at least one Category/Section');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEvent._id,
          name: editingEvent.name,
          categories: cats,
          category: cats.join(', '),
          gender: editingEvent.gender || 'Both',
          description: editingEvent.description,
          points: editingEvent.points,
          status: editingEvent.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEvents(prev => prev.map(ev => ev._id === editingEvent._id ? json.data : ev));
        notify('success', `Event "${editingEvent.name}" updated successfully!`);
        setEditingEvent(null);
      } else {
        notify('error', json.message || 'Failed to update event');
      }
    } catch (err) {
      notify('error', 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (id, name) => {
    if (!confirm(`Delete event "${name}"?`)) return;
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setEvents(prev => prev.filter(e => e._id !== id));
        notify('success', 'Event deleted');
      }
    } catch (err) {
      notify('error', 'Failed to delete event');
    }
  };

  // 3. MEKHALA HANDLERS
  const handleAddMekhala = async (e) => {
    e.preventDefault();
    if (!newMekhala.name.trim()) return;

    try {
      const res = await fetch('/api/mekhalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMekhala),
      });
      const json = await res.json();
      if (json.success) {
        setMekhalas(prev => [...prev, json.data]);
        notify('success', `Mekhala "${newMekhala.name}" added!`);
        setNewMekhala({ name: '', code: '' });
      } else {
        notify('error', json.message || 'Failed to add Mekhala');
      }
    } catch (err) {
      notify('error', 'Error adding Mekhala');
    }
  };

  const handleDeleteMekhala = async (id, name) => {
    if (!confirm(`Delete Mekhala "${name}"?`)) return;
    try {
      const res = await fetch(`/api/mekhalas?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMekhalas(prev => prev.filter(m => m._id !== id));
        notify('success', 'Mekhala deleted');
      }
    } catch (err) {
      notify('error', 'Failed to delete Mekhala');
    }
  };

  // 4. SAKHA HANDLERS
  const handleAddSakha = async (e) => {
    e.preventDefault();
    if (!newSakha.name.trim() || !newSakha.mekhala) {
      notify('error', 'Please provide Sakha name and select Mekhala');
      return;
    }

    try {
      const res = await fetch('/api/sakhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSakha),
      });
      const json = await res.json();
      if (json.success) {
        setSakhas(prev => [...prev, json.data]);
        notify('success', `Sakha "${newSakha.name}" added!`);
        setNewSakha(prev => ({ ...prev, name: '' }));
      } else {
        notify('error', json.message || 'Failed to add Sakha');
      }
    } catch (err) {
      notify('error', 'Error adding Sakha');
    }
  };

  const handleDeleteSakha = async (id, name) => {
    if (!confirm(`Delete Sakha "${name}"?`)) return;
    try {
      const res = await fetch(`/api/sakhas?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSakhas(prev => prev.filter(s => s._id !== id));
        notify('success', 'Sakha deleted');
      }
    } catch (err) {
      notify('error', 'Failed to delete Sakha');
    }
  };

  // 5. CANDIDATE EDITING & CHEST NUMBER ISSUANCE
  const handleSaveCandidateEdit = async (e) => {
    e.preventDefault();
    if (!editingCandidate) return;

    try {
      const res = await fetch('/api/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCandidate._id,
          chestNo: (editingCandidate.chestNo || '').trim(),
          name: editingCandidate.name,
          houseName: editingCandidate.houseName,
          dob: editingCandidate.dob,
          phone: editingCandidate.phone,
          mekhala: editingCandidate.mekhala,
          sakha: editingCandidate.sakha,
          section: editingCandidate.section,
          sex: editingCandidate.sex,
          event: editingCandidate.event,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCandidates(prev => prev.map(c => c._id === editingCandidate._id ? json.data : c));
        notify('success', 'Candidate details & Chest Number updated!');
        setEditingCandidate(null);
      } else {
        notify('error', json.message || 'Failed to update candidate');
      }
    } catch (err) {
      notify('error', 'Failed to update candidate');
    }
  };

  // Issue Chest Numbers to all candidates who don't have one yet
  const handleAutoAssignChestNumbers = async () => {
    const unassigned = candidates.filter(c => !c.chestNo || c.chestNo.trim() === '');
    if (unassigned.length === 0) {
      notify('success', 'All candidates already have chest numbers issued!');
      return;
    }

    if (!confirm(`Issue sequential chest numbers to ${unassigned.length} candidate(s)?`)) return;

    // Find highest existing numeric chest number
    let maxNum = 100;
    candidates.forEach(c => {
      if (c.chestNo) {
        const match = c.chestNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    let count = 0;
    for (const cand of unassigned) {
      maxNum += 1;
      const newChest = `CML-${maxNum}`;
      try {
        const res = await fetch('/api/candidates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cand._id, chestNo: newChest }),
        });
        const json = await res.json();
        if (json.success) {
          setCandidates(prev => prev.map(c => c._id === cand._id ? json.data : c));
          count += 1;
        }
      } catch (err) {
        console.error('Error assigning chest number:', err);
      }
    }
    notify('success', `Issued chest numbers to ${count} candidate(s)!`);
  };

  // Admin Add Candidate (Bypasses public registration deadline)
  const [showAdminAddCandidateModal, setShowAdminAddCandidateModal] = useState(false);
  const [adminCandidateForm, setAdminCandidateForm] = useState({
    name: '',
    houseName: '',
    dob: '',
    phone: '',
    mekhala: '',
    sakha: '',
    section: 'Junior',
    sex: 'Male',
    event: '',
    chestNo: '',
  });

  const handleAdminCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...adminCandidateForm, isAdmin: true }),
      });
      const json = await res.json();
      if (json.success) {
        setCandidates(prev => [json.data, ...prev]);
        notify('success', `Candidate "${adminCandidateForm.name}" registered successfully!`);
        setShowAdminAddCandidateModal(false);
        const validForJunior = events.filter(ev => isEventAvailableForCandidate(ev, 'Junior', 'Male'));
        setAdminCandidateForm({
          name: '',
          houseName: '',
          dob: '',
          phone: '',
          mekhala: mekhalas[0]?.name || '',
          sakha: '',
          section: 'Junior',
          sex: 'Male',
          event: validForJunior[0]?.name || '',
          chestNo: '',
        });
      } else {
        notify('error', json.message || 'Failed to register candidate');
      }
    } catch (err) {
      notify('error', 'Error submitting candidate');
    }
  };

  const handleDeleteCandidate = async (id, name) => {
    if (!confirm(`Delete candidate "${name}"?`)) return;
    try {
      const res = await fetch(`/api/candidates?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCandidates(prev => prev.filter(c => c._id !== id));
        notify('success', 'Candidate deleted');
      }
    } catch (err) {
      notify('error', 'Failed to delete candidate');
    }
  };

  // If not authenticated, show PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', maxWidth: '480px' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>
            Admin Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Enter your admin PIN/Password to configure events, candidates, and scoring.
          </p>

          <form onSubmit={handlePinSubmit}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="admin-pin">Admin Password</label>
              <input
                id="admin-pin"
                type="password"
                className="form-input"
                placeholder="Default: admin123"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            {pinError && (
              <div style={{
                color: '#fb7185',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                background: 'rgba(244, 63, 94, 0.1)',
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                {pinError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Admin Portal 🚀
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Configurable in <code>.env.local</code> as <code>ADMIN_PASSWORD</code>
          </div>
        </div>
      </div>
    );
  }

  // Selected event object for result entry
  const selectedEvent = events.find(e => e.name === selectedEventName) || events[0];
  const candidatesForSelectedEvent = selectedEvent
    ? candidates.filter(c => c.event === selectedEvent.name)
    : [];

  // Filtered candidates for candidate management tab
  const filteredCandidates = candidates.filter(c => {
    if (!candidateSearch) return true;
    const q = candidateSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.chestNo && c.chestNo.toLowerCase().includes(q)) ||
      c.event.toLowerCase().includes(q) ||
      c.mekhala.toLowerCase().includes(q) ||
      c.sakha.toLowerCase().includes(q)
    );
  });

  // Filtered Mekhalas for Mekhala management tab
  const filteredMekhalas = mekhalas.filter(m => {
    if (!mekhalaSearch.trim()) return true;
    const q = mekhalaSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.code && m.code.toLowerCase().includes(q))
    );
  });

  // Filtered Sakhas for Sakha management tab
  const filteredSakhas = sakhas.filter(s => {
    const matchesMekhala = sakhaMekhalaFilter === 'ALL' || s.mekhala === sakhaMekhalaFilter;
    if (!matchesMekhala) return false;
    if (!sakhaSearch.trim()) return true;
    const q = sakhaSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.mekhala && s.mekhala.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="hero-pill" style={{ marginBottom: '0.5rem' }}>
            <span>⚙️</span> Administration & Scoring Center
          </div>
          <h1 className="hero-title" style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage events, register Sakha/Mekhala, edit candidates, and record winner positions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={fetchAllData} className="btn btn-secondary btn-sm" disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
          <button type="button" onClick={handleLogout} className="btn btn-danger btn-sm">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: actionMessage.type === 'success' ? '#34d399' : '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span>{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Admin Sub Navigation */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeAdminTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('results')}
        >
          🏆 Result Entry & Scoring
        </button>
        <button
          type="button"
          className={`tab-btn ${activeAdminTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('events')}
        >
          🎪 Manage Events ({events.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeAdminTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('candidates')}
        >
          👥 Candidates ({candidates.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeAdminTab === 'mekhala' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('mekhala')}
        >
          📍 Mekhalas ({mekhalas.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeAdminTab === 'sakha' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('sakha')}
        >
          🏢 Sakhas ({sakhas.length})
        </button>
      </div>

      {/* TAB 1: RESULT ENTRY & SCORING */}
      {activeAdminTab === 'results' && (
        <div>
          <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '0.25rem' }}>Select Event to Enter Results</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Assigning positions and grades immediately calculates candidate, Sakha, and Mekhala points.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="form-select"
                  style={{ minWidth: '220px' }}
                  value={selectedEventName}
                  onChange={(e) => setSelectedEventName(e.target.value)}
                >
                  {events.map(ev => (
                    <option key={ev._id || ev.name} value={ev.name}>
                      {ev.name} ({ev.status || 'Upcoming'})
                    </option>
                  ))}
                </select>

                {selectedEvent && (
                  <select
                    className="form-select"
                    style={{ width: 'auto' }}
                    value={selectedEvent.status || 'Upcoming'}
                    onChange={(e) => handleEventStatusChange(selectedEvent._id, e.target.value)}
                  >
                    <option value="Upcoming">Status: Upcoming</option>
                    <option value="In Progress">Status: In Progress</option>
                    <option value="Completed">Status: Completed</option>
                  </select>
                )}

                {selectedEvent && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => openPrintModal('stage', selectedEvent, candidatesForSelectedEvent)}
                      title="Print candidate call sheet for Stage Managers"
                    >
                      📋 Stage Sheet
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => openPrintModal('result', selectedEvent, candidatesForSelectedEvent)}
                      title="Print official result sheet for this event"
                    >
                      🏆 Result Sheet
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Event Points Legend */}
            {selectedEvent && (
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <div><strong>Point Rules for this Event:</strong></div>
                <span>🥇 1st: <strong style={{ color: '#fbbf24' }}>{selectedEvent.points?.first ?? 5} pts</strong></span>
                <span>🥈 2nd: <strong style={{ color: '#cbd5e1' }}>{selectedEvent.points?.second ?? 3} pts</strong></span>
                <span>🥉 3rd: <strong style={{ color: '#d97706' }}>{selectedEvent.points?.third ?? 1} pts</strong></span>
                <span>⭐ Grade A: <strong style={{ color: 'var(--accent-cyan)' }}>+{selectedEvent.points?.gradeA ?? 5} pts</strong></span>
                <span>⭐ Grade B: <strong style={{ color: 'var(--accent-cyan)' }}>+{selectedEvent.points?.gradeB ?? 3} pts</strong></span>
                <span>⭐ Grade C: <strong style={{ color: 'var(--accent-cyan)' }}>+{selectedEvent.points?.gradeC ?? 1} pts</strong></span>
              </div>
            )}
          </div>

          {/* Candidates in selected event */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Chest No</th>
                  <th>Candidate Name</th>
                  <th>Sakha</th>
                  <th>Mekhala</th>
                  <th style={{ minWidth: '150px' }}>Position</th>
                  <th style={{ minWidth: '130px' }}>Grade</th>
                  <th style={{ textAlign: 'right' }}>Calculated Points</th>
                </tr>
              </thead>
              <tbody>
                {candidatesForSelectedEvent.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No candidates registered for this event yet.
                    </td>
                  </tr>
                ) : (
                  candidatesForSelectedEvent.map(cand => (
                    <tr key={cand._id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {cand.chestNo}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#fff' }}>{cand.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cand.houseName}</div>
                      </td>
                      <td>{cand.sakha}</td>
                      <td>{cand.mekhala}</td>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={cand.position || 'None'}
                          onChange={(e) => handleResultChange(cand._id, 'position', e.target.value)}
                        >
                          <option value="None">None</option>
                          <option value="First">🥇 1st Place</option>
                          <option value="Second">🥈 2nd Place</option>
                          <option value="Third">🥉 3rd Place</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={cand.grade || 'None'}
                          onChange={(e) => handleResultChange(cand._id, 'grade', e.target.value)}
                        >
                          <option value="None">None</option>
                          <option value="A">Grade A</option>
                          <option value="B">Grade B</option>
                          <option value="C">Grade C</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="points-pill" style={{ fontSize: '0.95rem' }}>
                          {cand.totalPoints || 0} pts
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

      {/* TAB 2: MANAGE EVENTS */}
      {activeAdminTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '2rem' }}>
          {/* Add Event Form */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '1.25rem' }}>Add New Event</h3>
            <form onSubmit={handleAddEvent}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Event Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Malayalam Recitation"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Categories / Sections * <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({newEvent.categories?.length || 0} selected)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => setNewEvent(prev => ({
                        ...prev,
                        categories: [...SECTION_OPTIONS],
                        category: SECTION_OPTIONS.join(', ')
                      }))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => setNewEvent(prev => ({
                        ...prev,
                        categories: [],
                        category: ''
                      }))}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: (newEvent.categories?.length === 0) ? '1px dashed #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  {SECTION_OPTIONS.map((sec) => {
                    const isSelected = newEvent.categories?.includes(sec);
                    return (
                      <label
                        key={sec}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? '600' : '400',
                          background: isSelected ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(129, 140, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => {
                            const current = newEvent.categories || [];
                            const updated = isSelected
                              ? current.filter(c => c !== sec)
                              : [...current, sec];
                            setNewEvent({
                              ...newEvent,
                              categories: updated,
                              category: updated.join(', ')
                            });
                          }}
                          style={{
                            accentColor: 'var(--brand-color, #6366f1)',
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                        <span>{sec}</span>
                      </label>
                    );
                  })}
                </div>
                {newEvent.categories?.length > 1 && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#c7d2fe' }}>
                        ⚡ Multiple Sections Selected ({newEvent.categories.length})
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${newEvent.separateEvents !== false ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => setNewEvent({ ...newEvent, separateEvents: true })}
                        >
                          ✓ Add to each Section ({newEvent.categories.length} events)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${newEvent.separateEvents === false ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => setNewEvent({ ...newEvent, separateEvents: false })}
                        >
                          Single Combined Event
                        </button>
                      </div>
                    </div>
                    {newEvent.separateEvents !== false ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Will create {newEvent.categories.length} separate events:{' '}
                        <span style={{ color: '#fff', fontWeight: '500' }}>
                          {newEvent.categories.map(sec => getSectionEventName(newEvent.name || 'Event', sec)).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        All selected sections ({newEvent.categories.join(', ')}) will compete together in one combined event.
                      </div>
                    )}
                  </div>
                )}
                {newEvent.categories?.length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.35rem', display: 'block' }}>
                    ⚠️ Please select at least one Category/Section.
                  </span>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem' }}>
                  Candidate Gender Eligibility *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = (newEvent.gender || 'Both') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, gender: opt.value })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? '600' : '400',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.35))'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid rgba(129, 140, 248, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Rules, time limits, or notes"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>

              {/* Position Points Configuration */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Position Points Configuration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1st Place</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.first}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, first: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2nd Place</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.second}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, second: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3rd Place</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.third}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, third: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Grade Points Configuration */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Grade Points Configuration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade A</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.gradeA}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, gradeA: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade B</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.gradeB}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, gradeB: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade C</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={newEvent.points.gradeC}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        points: { ...newEvent.points, gradeC: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {newEvent.categories?.length > 1 && newEvent.separateEvents !== false
                  ? `➕ Create ${newEvent.categories.length} Events (One per Section)`
                  : '➕ Create Event'}
              </button>
            </form>
          </div>

          {/* Existing Events List */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Categories / Sections</th>
                  <th>Gender</th>
                  <th>Position Pts (1/2/3)</th>
                  <th>Grade Pts (A/B/C)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev._id || ev.name}>
                    <td>
                      <strong style={{ color: '#fff' }}>{ev.name}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {getEventCategories(ev).map((cat, idx) => (
                          <span key={idx} className="event-category-badge">{cat}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`gender-badge ${(ev.gender || 'Both').toLowerCase()}`}>
                        {formatEventGender(ev)}
                      </span>
                    </td>
                    <td>
                      {ev.points?.first ?? 5} / {ev.points?.second ?? 3} / {ev.points?.third ?? 1}
                    </td>
                    <td>
                      {ev.points?.gradeA ?? 5} / {ev.points?.gradeB ?? 3} / {ev.points?.gradeC ?? 1}
                    </td>
                    <td>
                      <span className={`event-status ${
                        ev.status === 'Completed' ? 'completed' : ev.status === 'In Progress' ? 'progress' : 'upcoming'
                      }`}>
                        {ev.status || 'Upcoming'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Print candidate call sheet for Stage Managers"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => openPrintModal('stage', ev, candidates.filter(c => c.event === ev.name))}
                        >
                          📋 Stage
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Print official result sheet"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => openPrintModal('result', ev, candidates.filter(c => c.event === ev.name))}
                        >
                          🏆 Result
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingEvent({
                            ...ev,
                            gender: ev.gender || 'Both',
                            categories: getEventCategories(ev),
                          })}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteEvent(ev._id, ev.name)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE CANDIDATES */}
      {activeAdminTab === 'candidates' && (
        <div>
          <div className="filter-bar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Search candidates by name, chest no, event, sakha, mekhala..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAutoAssignChestNumbers}
                title="Automatically assign sequential chest numbers to all unissued candidates"
              >
                ⚡ Issue Chest Numbers ({candidates.filter(c => !c.chestNo || c.chestNo.trim() === '').length} Pending)
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const initialValid = events.filter(ev => isEventAvailableForCandidate(ev, 'Junior', 'Male'));
                  setAdminCandidateForm({
                    name: '',
                    houseName: '',
                    dob: '',
                    phone: '',
                    mekhala: mekhalas[0]?.name || '',
                    sakha: '',
                    section: 'Junior',
                    sex: 'Male',
                    event: initialValid[0]?.name || '',
                    chestNo: '',
                  });
                  setShowAdminAddCandidateModal(true);
                }}
              >
                ➕ Add Candidate (Admin)
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Chest No</th>
                  <th>Candidate Name</th>
                  <th>House Name</th>
                  <th>DOB</th>
                  <th>Phone</th>
                  <th>Sex</th>
                  <th>Sakha & Mekhala</th>
                  <th>Section</th>
                  <th>Event</th>
                  <th>Pts</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No candidates found.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map(c => (
                    <tr key={c._id}>
                      <td>
                        {c.chestNo ? (
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {c.chestNo}
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td><strong style={{ color: '#fff' }}>{c.name}</strong></td>
                      <td>{c.houseName}</td>
                      <td>{c.dob}</td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                          {c.phone || '—'}
                        </span>
                      </td>
                      <td>{c.sex}</td>
                      <td>
                        <div>{c.sakha}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.mekhala}</div>
                      </td>
                      <td>{c.section}</td>
                      <td>{c.event}</td>
                      <td><span className="points-pill">{c.totalPoints || 0}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingCandidate({ ...c })}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteCandidate(c._id, c.name)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MANAGE MEKHALAS */}
      {activeAdminTab === 'mekhala' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '1.25rem' }}>Add New Mekhala</h3>
            <form onSubmit={handleAddMekhala}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Mekhala Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. North Zone, Wayanad"
                  value={newMekhala.name}
                  onChange={(e) => setNewMekhala({ ...newMekhala, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Short Code (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NZ, WYD"
                  value={newMekhala.code}
                  onChange={(e) => setNewMekhala({ ...newMekhala, code: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                ➕ Add Mekhala
              </button>
            </form>
          </div>

          <div>
            <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="search-box" style={{ flex: 1 }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search mekhala by name or short code..."
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

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mekhala Name</th>
                    <th>Short Code</th>
                    <th>Registered Candidates</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMekhalas.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No mekhalas match your search "{mekhalaSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredMekhalas.map(m => {
                      const count = candidates.filter(c => c.mekhala === m.name).length;
                      return (
                        <tr key={m._id || m.name}>
                          <td><strong style={{ color: '#fff' }}>{m.name}</strong></td>
                          <td>{m.code || '—'}</td>
                          <td>{count}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteMekhala(m._id, m.name)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MANAGE SAKHAS */}
      {activeAdminTab === 'sakha' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '1.25rem' }}>Add New Sakha</h3>
            <form onSubmit={handleAddSakha}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Parent Mekhala *</label>
                <select
                  className="form-select"
                  value={newSakha.mekhala}
                  onChange={(e) => setNewSakha({ ...newSakha, mekhala: e.target.value })}
                  required
                >
                  <option value="">-- Choose Mekhala --</option>
                  {mekhalas.map(m => (
                    <option key={m._id || m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Sakha Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kozhikode Town"
                  value={newSakha.name}
                  onChange={(e) => setNewSakha({ ...newSakha, name: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                ➕ Add Sakha
              </button>
            </form>
          </div>

          <div>
            <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search sakha by name or parent mekhala..."
                  className="form-input"
                  value={sakhaSearch}
                  onChange={(e) => setSakhaSearch(e.target.value)}
                />
              </div>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '180px' }}
                value={sakhaMekhalaFilter}
                onChange={(e) => setSakhaMekhalaFilter(e.target.value)}
              >
                <option value="ALL">All Mekhalas</option>
                {mekhalas.map(m => (
                  <option key={m._id || m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              {(sakhaSearch || sakhaMekhalaFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSakhaSearch('');
                    setSakhaMekhalaFilter('ALL');
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Sakha Name</th>
                    <th>Parent Mekhala</th>
                    <th>Registered Candidates</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSakhas.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No sakhas match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSakhas.map(s => {
                      const count = candidates.filter(c => c.sakha === s.name).length;
                      return (
                        <tr key={s._id || s.name}>
                          <td><strong style={{ color: '#fff' }}>{s.name}</strong></td>
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
                          <td>{count}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteSakha(s._id, s.name)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Event: {editingEvent.name}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingEvent(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateEvent}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Event Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingEvent.name}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Categories / Sections * <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({editingEvent.categories?.length || 0} selected)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => setEditingEvent(prev => ({
                        ...prev,
                        categories: [...SECTION_OPTIONS],
                      }))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => setEditingEvent(prev => ({
                        ...prev,
                        categories: [],
                      }))}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: (!editingEvent.categories || editingEvent.categories.length === 0) ? '1px dashed #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  {SECTION_OPTIONS.map((sec) => {
                    const isSelected = editingEvent.categories?.includes(sec);
                    return (
                      <label
                        key={sec}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? '600' : '400',
                          background: isSelected ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(129, 140, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => {
                            const current = editingEvent.categories || [];
                            const updated = isSelected
                              ? current.filter(c => c !== sec)
                              : [...current, sec];
                            setEditingEvent({
                              ...editingEvent,
                              categories: updated,
                            });
                          }}
                          style={{
                            accentColor: 'var(--brand-color, #6366f1)',
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                        <span>{sec}</span>
                      </label>
                    );
                  })}
                </div>
                {(!editingEvent.categories || editingEvent.categories.length === 0) && (
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.35rem', display: 'block' }}>
                    ⚠️ Please select at least one Category/Section.
                  </span>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem' }}>
                  Candidate Gender Eligibility *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = (editingEvent.gender || 'Both') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditingEvent({ ...editingEvent, gender: opt.value })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? '600' : '400',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.35))'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid rgba(129, 140, 248, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editingEvent.status || 'Upcoming'}
                  onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!editingEvent.categories || editingEvent.categories.length === 0}
                >
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CANDIDATE MODAL */}
      {editingCandidate && (
        <div className="modal-overlay" onClick={() => setEditingCandidate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Candidate: {editingCandidate.name}</h3>
              <button 
                type="button" 
                className="modal-close"
                onClick={() => setEditingCandidate(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCandidateEdit}>
              <div className="form-grid">
                <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">
                    Official Chest Number <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Issued after registration completion)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CML-101"
                    value={editingCandidate.chestNo || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, chestNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Candidate Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingCandidate.name}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">House Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingCandidate.houseName}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, houseName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editingCandidate.dob}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, dob: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9847123456"
                    value={editingCandidate.phone || ''}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sex *</label>
                  <select
                    className="form-select"
                    value={editingCandidate.sex}
                    onChange={(e) => {
                      const newSex = e.target.value;
                      const validForNew = events.filter(ev => isEventAvailableForCandidate(ev, editingCandidate.section, newSex));
                      const isStillValid = validForNew.some(ev => ev.name === editingCandidate.event);
                      setEditingCandidate({
                        ...editingCandidate,
                        sex: newSex,
                        event: isStillValid ? editingCandidate.event : (validForNew[0]?.name || '')
                      });
                    }}
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mekhala *</label>
                  <select
                    className="form-select"
                    value={editingCandidate.mekhala}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, mekhala: e.target.value })}
                    required
                  >
                    {mekhalas.map(m => (
                      <option key={m._id || m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sakha *</label>
                  <select
                    className="form-select"
                    value={editingCandidate.sakha}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, sakha: e.target.value })}
                    required
                  >
                    {sakhas.map(s => (
                      <option key={s._id || s.name} value={s.name}>{s.name} ({s.mekhala})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select
                    className="form-select"
                    value={editingCandidate.section}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      const validForNew = events.filter(ev => isEventAvailableForCandidate(ev, newSec, editingCandidate.sex));
                      const isStillValid = validForNew.some(ev => ev.name === editingCandidate.event);
                      setEditingCandidate({
                        ...editingCandidate,
                        section: newSec,
                        event: isStillValid ? editingCandidate.event : (validForNew[0]?.name || '')
                      });
                    }}
                    required
                  >
                    <option value="Sub-Junior">Sub-Junior</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Super Senior">Super Senior</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Event *
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      ({events.filter(ev => isEventAvailableForCandidate(ev, editingCandidate.section, editingCandidate.sex)).length} available for {editingCandidate.section} / {editingCandidate.sex})
                    </span>
                  </label>
                  <select
                    className="form-select"
                    value={editingCandidate.event}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, event: e.target.value })}
                    required
                  >
                    <option value="">-- Select Event --</option>
                    {events
                      .filter(ev => isEventAvailableForCandidate(ev, editingCandidate.section, editingCandidate.sex))
                      .map(ev => (
                        <option key={ev._id || ev.name} value={ev.name}>
                          {ev.name} ({formatEventCategories(ev)} • {formatEventGender(ev)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingCandidate(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ADD CANDIDATE MODAL (Bypasses public registration deadline) */}
      {showAdminAddCandidateModal && (
        <div className="modal-overlay" onClick={() => setShowAdminAddCandidateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add Candidate (Admin Entry)</h3>
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                  ✓ Bypasses public registration deadline
                </span>
              </div>
              <button 
                type="button" 
                className="modal-close"
                onClick={() => setShowAdminAddCandidateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminCandidateSubmit}>
              <div className="form-grid">
                <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">
                    Chest Number <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Leave blank to issue later)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CML-105"
                    value={adminCandidateForm.chestNo}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, chestNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Candidate Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={adminCandidateForm.name}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">House Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={adminCandidateForm.houseName}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, houseName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={adminCandidateForm.dob}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, dob: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 9847123456"
                    value={adminCandidateForm.phone}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sex *</label>
                  <select
                    className="form-select"
                    value={adminCandidateForm.sex}
                    onChange={(e) => {
                      const newSex = e.target.value;
                      const validForNew = events.filter(ev => isEventAvailableForCandidate(ev, adminCandidateForm.section, newSex));
                      const isStillValid = validForNew.some(ev => ev.name === adminCandidateForm.event);
                      setAdminCandidateForm({
                        ...adminCandidateForm,
                        sex: newSex,
                        event: isStillValid ? adminCandidateForm.event : (validForNew[0]?.name || '')
                      });
                    }}
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mekhala *</label>
                  <select
                    className="form-select"
                    value={adminCandidateForm.mekhala}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, mekhala: e.target.value, sakha: '' })}
                    required
                  >
                    <option value="">-- Select Mekhala --</option>
                    {mekhalas.map(m => (
                      <option key={m._id || m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sakha *</label>
                  <select
                    className="form-select"
                    value={adminCandidateForm.sakha}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, sakha: e.target.value })}
                    required
                  >
                    <option value="">-- Select Sakha --</option>
                    {sakhas
                      .filter(s => !adminCandidateForm.mekhala || s.mekhala === adminCandidateForm.mekhala)
                      .map(s => (
                        <option key={s._id || s.name} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select
                    className="form-select"
                    value={adminCandidateForm.section}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      const validForNew = events.filter(ev => isEventAvailableForCandidate(ev, newSec, adminCandidateForm.sex));
                      const isStillValid = validForNew.some(ev => ev.name === adminCandidateForm.event);
                      setAdminCandidateForm({
                        ...adminCandidateForm,
                        section: newSec,
                        event: isStillValid ? adminCandidateForm.event : (validForNew[0]?.name || '')
                      });
                    }}
                    required
                  >
                    <option value="Sub-Junior">Sub-Junior</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Super Senior">Super Senior</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Event *
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      ({events.filter(ev => isEventAvailableForCandidate(ev, adminCandidateForm.section, adminCandidateForm.sex)).length} available for {adminCandidateForm.section} / {adminCandidateForm.sex})
                    </span>
                  </label>
                  <select
                    className="form-select"
                    value={adminCandidateForm.event}
                    onChange={(e) => setAdminCandidateForm({ ...adminCandidateForm, event: e.target.value })}
                    required
                  >
                    <option value="">-- Select Event --</option>
                    {events
                      .filter(ev => isEventAvailableForCandidate(ev, adminCandidateForm.section, adminCandidateForm.sex))
                      .map(ev => (
                        <option key={ev._id || ev.name} value={ev.name}>
                          {ev.name} ({formatEventCategories(ev)} • {formatEventGender(ev)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdminAddCandidateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Sheet Modal (for Stage Managers and Official Results) */}
      <PrintSheetModal
        isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        initialType={printModalState.type}
        event={printModalState.event}
        candidates={printModalState.candidates}
      />
    </div>
  );
}
