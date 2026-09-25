'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    houseName: '',
    dob: '',
    phone: '',
    mekhala: '',
    sakha: '',
    section: 'Junior',
    sex: 'Male',
    event: '',
  });

  const [mekhalas, setMekhalas] = useState([]);
  const [sakhas, setSakhas] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [registeredCandidate, setRegisteredCandidate] = useState(null);

  // Fetch Mekhalas, Sakhas, and Events
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [resM, resS, resE] = await Promise.all([
          fetch('/api/mekhalas'),
          fetch('/api/sakhas'),
          fetch('/api/events'),
        ]);

        const dataM = await resM.json();
        const dataS = await resS.json();
        const dataE = await resE.json();

        if (dataM.success) setMekhalas(dataM.data || []);
        if (dataS.success) setSakhas(dataS.data || []);
        if (dataE.success) {
          const evList = dataE.data || [];
          setEvents(evList);
          if (evList.length > 0) {
            setFormData(prev => ({ ...prev, event: evList[0].name }));
          }
        }
      } catch (err) {
        console.error('Error loading dropdown data:', err);
      } finally {
        setFetchingData(false);
      }
    }
    loadInitialData();
  }, []);

  // Filter Sakhas based on selected Mekhala
  const availableSakhas = formData.mekhala
    ? sakhas.filter(s => s.mekhala.toLowerCase() === formData.mekhala.toLowerCase())
    : sakhas;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mekhala') {
      setFormData(prev => ({
        ...prev,
        mekhala: value,
        sakha: '', // Reset sakha when mekhala changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    // Form validation
    if (!formData.name.trim() || !formData.houseName.trim() || !formData.dob) {
      setStatusMessage({ type: 'error', text: 'Please fill in Name, House Name, and Date of Birth.' });
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Contact Phone Number.' });
      setLoading(false);
      return;
    }

    if (!formData.mekhala || !formData.sakha) {
      setStatusMessage({ type: 'error', text: 'Please select both Mekhala and Sakha.' });
      setLoading(false);
      return;
    }

    if (!formData.event) {
      setStatusMessage({ type: 'error', text: 'Please choose an Event.' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (result.success) {
        setRegisteredCandidate(result.data);
        setStatusMessage({ type: 'success', text: 'Candidate successfully registered!' });
        // Reset form
        setFormData({
          name: '',
          houseName: '',
          dob: '',
          phone: '',
          mekhala: '',
          sakha: '',
          section: 'Junior',
          sex: 'Male',
          event: events[0]?.name || '',
        });
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Registration failed' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="hero-pill">
          <span>✨</span> Official Registration Portal
        </div>
        <h1 className="hero-title" style={{ fontSize: '2.4rem' }}>Candidate Registration</h1>
        <p className="hero-subtitle">
          Register candidates for festival events. Chest numbers and tracking will be automatically generated.
        </p>
      </div>

      {statusMessage && (
        <div style={{
          maxWidth: '780px',
          margin: '0 auto 1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: statusMessage.type === 'success' ? '#34d399' : '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span>{statusMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {registeredCandidate ? (
        <div className="glass-panel form-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>
            Registration Successful!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Candidate has been registered to database <strong>CMLResult</strong>.
          </p>

          <div className="candidate-badge-card">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OFFICIAL CHEST NUMBER
            </span>
            <div className="chest-number-big">{registeredCandidate.chestNo}</div>
            <h3 style={{ fontSize: '1.4rem', color: '#fff', margin: '0.5rem 0 0.25rem' }}>
              {registeredCandidate.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {registeredCandidate.houseName} • {registeredCandidate.sex} • Section: {registeredCandidate.section}
              {registeredCandidate.phone && ` • 📞 ${registeredCandidate.phone}`}
            </p>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              <div>📍 <strong>Mekhala:</strong> {registeredCandidate.mekhala}</div>
              <div>🏢 <strong>Sakha:</strong> {registeredCandidate.sakha}</div>
              <div>🎪 <strong>Event:</strong> {registeredCandidate.event}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setRegisteredCandidate(null)}
            >
              ➕ Register Another Candidate
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handlePrint}
            >
              🖨️ Print Badge
            </button>
            <Link href="/" className="btn btn-secondary">
              🏆 View Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-panel form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Candidate Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Candidate Name <span className="req">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Muhammed Nihal"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* House Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="houseName">
                  House Name <span className="req">*</span>
                </label>
                <input
                  id="houseName"
                  type="text"
                  name="houseName"
                  className="form-input"
                  placeholder="e.g. Rose Villa, Kuttikkat House"
                  value={formData.houseName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* DOB */}
              <div className="form-group">
                <label className="form-label" htmlFor="dob">
                  Date of Birth (DOB) <span className="req">*</span>
                </label>
                <input
                  id="dob"
                  type="date"
                  name="dob"
                  className="form-input"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number <span className="req">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="e.g. 9847123456"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Sex */}
              <div className="form-group">
                <label className="form-label" htmlFor="sex">
                  Sex <span className="req">*</span>
                </label>
                <select
                  id="sex"
                  name="sex"
                  className="form-select"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mekhala */}
              <div className="form-group">
                <label className="form-label" htmlFor="mekhala">
                  Mekhala <span className="req">*</span>
                </label>
                <select
                  id="mekhala"
                  name="mekhala"
                  className="form-select"
                  value={formData.mekhala}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Mekhala --</option>
                  {mekhalas.map(m => (
                    <option key={m._id || m.name} value={m.name}>
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sakha */}
              <div className="form-group">
                <label className="form-label" htmlFor="sakha">
                  Sakha <span className="req">*</span>
                </label>
                <select
                  id="sakha"
                  name="sakha"
                  className="form-select"
                  value={formData.sakha}
                  onChange={handleChange}
                  required
                  disabled={!formData.mekhala}
                >
                  <option value="">
                    {formData.mekhala ? '-- Select Sakha --' : '-- Choose Mekhala First --'}
                  </option>
                  {availableSakhas.map(s => (
                    <option key={s._id || s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="form-group">
                <label className="form-label" htmlFor="section">
                  Section <span className="req">*</span>
                </label>
                <select
                  id="section"
                  name="section"
                  className="form-select"
                  value={formData.section}
                  onChange={handleChange}
                  required
                >
                  <option value="Sub-Junior">Sub-Junior</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Super Senior">Super Senior</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Event */}
              <div className="form-group">
                <label className="form-label" htmlFor="event">
                  Event <span className="req">*</span>
                </label>
                <select
                  id="event"
                  name="event"
                  className="form-select"
                  value={formData.event}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Select Event --</option>
                  {events.map(ev => (
                    <option key={ev._id || ev.name} value={ev.name}>
                      {ev.name} ({ev.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ minWidth: '200px' }}
                disabled={loading || fetchingData}
              >
                {loading ? 'Registering...' : 'Complete Registration 🚀'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
