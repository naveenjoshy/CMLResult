'use client';

import { useState, useEffect } from 'react';
import {
  getEventCategories,
  isGroupEvent,
  isEventAvailableForGender,
  isEventAvailableForSection,
  formatEventCategories,
  formatEventGender,
  calculateAge,
  getCategoryForDob,
  DEFAULT_CATEGORY_RULES,
} from '@/lib/eventUtils';
import BrandBanner from '@/components/BrandBanner';
import DateInput from '@/components/DateInput';

function isRegistrationEventAvailable(event, section, sex) {
  const groupEvent = isGroupEvent(event);
  const matchesSection = Boolean(section) && isEventAvailableForSection(event, section);
  return isEventAvailableForGender(event, sex) && (groupEvent || matchesSection);
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    houseName: '',
    dob: '',
    phone: '',
    mekhala: '',
    parish: '',
    section: '',
    sex: 'Male',
    event: '',
  });

  const [mekhalas, setMekhalas] = useState([]);
  const [parishes, setParishes] = useState([]);
  const [events, setEvents] = useState([]);
  const [categoryRules, setCategoryRules] = useState(DEFAULT_CATEGORY_RULES);
  const [categoryRulesLoaded, setCategoryRulesLoaded] = useState(false);
  const [regStatus, setRegStatus] = useState({ isOpen: true, endDate: null, endDateFormatted: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [registeredCandidate, setRegisteredCandidate] = useState(null);

  // Fetch Mekhalas, Parishes, Events, Categories, and Registration Status
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [resM, resS, resE, resReg, resCat] = await Promise.all([
          fetch('/api/mekhalas'),
          fetch('/api/parishes'),
          fetch('/api/events'),
          fetch('/api/registration-status'),
          fetch('/api/categories'),
        ]);

        const dataM = await resM.json();
        const dataS = await resS.json();
        const dataE = await resE.json();
        const dataReg = await resReg.json();
        const dataCat = await resCat.json();

        if (dataM.success) setMekhalas(dataM.data || []);
        if (dataS.success) setParishes(dataS.data || []);
        if (dataReg.success) setRegStatus(dataReg);
        if (dataCat.success) {
          setCategoryRules(dataCat.data?.length > 0 ? dataCat.data : DEFAULT_CATEGORY_RULES);
          setCategoryRulesLoaded(true);
        }
        if (dataE.success) {
          setEvents(dataE.data || []);
        }
      } catch (err) {
        console.error('Error loading dropdown data:', err);
      } finally {
        setFetchingData(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!categoryRulesLoaded) return;

    setFormData(prev => {
      const selectedEvent = events.find(event => event.name === prev.event);
      const section = prev.dob
        ? getCategoryForDob(prev.dob, categoryRules)
        : (isGroupEvent(selectedEvent) ? 'Group' : '');
      const validEvents = events.filter(event => isRegistrationEventAvailable(event, section, prev.sex));
      const event = validEvents.some(candidateEvent => candidateEvent.name === prev.event)
        ? prev.event
        : '';

      if (prev.section === section && prev.event === event) return prev;
      return { ...prev, section, event };
    });
  }, [categoryRulesLoaded, categoryRules, events]);

  // Filter Parishes based on selected Mekhala
  const availableParishes = formData.mekhala
    ? parishes.filter(s => s.mekhala.toLowerCase() === formData.mekhala.toLowerCase())
    : parishes;

  // Until DOB resolves to a section, only Group events are available.
  const availableEvents = events.filter(ev =>
    isRegistrationEventAvailable(ev, formData.section, formData.sex)
  );
  const hasResolvedCategory = Boolean(categoryRulesLoaded && formData.dob && formData.section);
  const selectedRegistrationEvent = events.find(event => event.name === formData.event);
  const dobOptional = isGroupEvent(selectedRegistrationEvent);
  const eventAvailabilityText = hasResolvedCategory
    ? `${availableEvents.length} available for ${formData.section} • ${formData.sex}`
    : `${availableEvents.length} Group events until DOB is selected`;
  const eventPlaceholder = !categoryRulesLoaded
    ? '-- Loading categories; Group events only --'
    : !formData.dob
      ? availableEvents.length > 0
        ? `-- Select Group Event (${availableEvents.length} available) --`
        : '-- Select DOB to view section events --'
      : availableEvents.length > 0
        ? `-- Select Event (${availableEvents.length} available for ${formData.section} • ${formData.sex}) --`
        : `-- No events available for ${formData.section} • ${formData.sex} --`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dob') {
      const selectedEvent = events.find(event => event.name === formData.event);
      const newSec = value
        ? (categoryRulesLoaded ? getCategoryForDob(value, categoryRules) : '')
        : (isGroupEvent(selectedEvent) ? 'Group' : '');
      const validForNew = events.filter(ev => isRegistrationEventAvailable(ev, newSec, formData.sex));
      const currentValid = validForNew.some(ev => ev.name === formData.event);
      setFormData(prev => ({
        ...prev,
        dob: value,
        section: newSec,
        event: currentValid ? prev.event : '',
      }));
    } else if (name === 'event') {
      const selectedEvent = events.find(event => event.name === value);
      setFormData(prev => ({
        ...prev,
        event: value,
        section: prev.dob
          ? (categoryRulesLoaded ? getCategoryForDob(prev.dob, categoryRules) : '')
          : (isGroupEvent(selectedEvent) ? 'Group' : ''),
      }));
    } else if (name === 'mekhala') {
      setFormData(prev => ({
        ...prev,
        mekhala: value,
        parish: '', // Reset parish when mekhala changes
      }));
    } else if (name === 'section' || name === 'sex') {
      const newSec = name === 'section' ? value : formData.section;
      const newSex = name === 'sex' ? value : formData.sex;
      const validForNew = events.filter(ev => isRegistrationEventAvailable(ev, newSec, newSex));
      const currentValid = validForNew.some(ev => ev.name === formData.event);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        event: currentValid ? prev.event : '',
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
    const isGroupRegistration = isGroupEvent(selectedRegistrationEvent);

    // Form validation
    if (!formData.name.trim() || !formData.houseName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in Candidate Name and House Name.' });
      setLoading(false);
      return;
    }

    if (!formData.dob && !isGroupRegistration) {
      setStatusMessage({ type: 'error', text: 'Date of Birth is required unless you select a Group event.' });
      setLoading(false);
      return;
    }

    if (formData.dob && (!categoryRulesLoaded || !formData.section)) {
      setStatusMessage({ type: 'error', text: 'Candidate category is still loading. Please try again shortly.' });
      setLoading(false);
      return;
    }

    const normalizedPhone = formData.phone.trim();
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setStatusMessage({ type: 'error', text: 'Phone number must contain exactly 10 digits.' });
      setLoading(false);
      return;
    }

    if (!formData.mekhala || !formData.parish) {
      setStatusMessage({ type: 'error', text: 'Please select both Mekhala and Parish.' });
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
        body: JSON.stringify({
          ...formData,
          phone: normalizedPhone,
          section: isGroupRegistration && !formData.dob ? 'Group' : formData.section,
          dob: formData.dob || '',
        }),
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
          parish: '',
          section: '',
          sex: 'Male',
          event: '',
        });
      } else {
        if (result.isClosed) {
          setRegStatus(prev => ({ ...prev, isOpen: false }));
        }
        setStatusMessage({ type: 'error', text: result.message || 'Registration failed' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <BrandBanner className="hero-brand-title" />
        <h1 className="hero-title" style={{ fontSize: '2.4rem' }}>Candidate Registration</h1>

        {regStatus.isOpen && regStatus.endDateFormatted && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            <span>⏳</span> Registration Deadline: <strong>{regStatus.endDateFormatted}</strong>
          </div>
        )}
        <p style={{
          color: '#ef4444',
          fontSize: '0.88rem',
          lineHeight: 1.5,
          maxWidth: '680px',
          margin: '0.75rem auto 0',
        }}>
          For group events, enter one candidate per registration. Date of birth is optional.
        </p>
      </div>

      {/* REGISTRATION CLOSED SCREEN */}
      {!regStatus.isOpen ? (
        <div className="glass-panel form-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⛔</div>
          <div className="hero-pill" style={{
            background: 'rgba(244, 63, 94, 0.15)',
            borderColor: 'rgba(244, 63, 94, 0.3)',
            color: '#fb7185'
          }}>
            Registration Closed
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: '#fff', margin: '1rem 0 0.5rem' }}>
            Registration Date is Over
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 2rem' }}>
            registration date is over, contact admin for more details.
          </p>
          <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Please check back during the next registration window.
          </div>
        </div>
      ) : registeredCandidate ? (
        /* REGISTRATION CONFIRMATION CARD (NO AUTO CHEST NUMBER) */
        <div className="glass-panel form-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>
            Registration Successful!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Candidate details recorded. Official Chest Number will be issued by the fest administration after registration completes.
          </p>

          <div className="candidate-badge-card">
            <span style={{
              display: 'inline-block',
              fontSize: '0.85rem',
              color: '#fbbf24',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '0.75rem'
            }}>
              ⏳ Chest Number: Pending Admin Issuance
            </span>
            
            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: '0.5rem 0 0.25rem' }}>
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
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap'
            }}>
              <div>📍 <strong>Mekhala:</strong> {registeredCandidate.mekhala}</div>
              <div>🏢 <strong>Parish:</strong> {registeredCandidate.parish}</div>
              <div>🎪 <strong>Event:</strong> {registeredCandidate.event}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => setRegisteredCandidate(null)}
            >
              ➕ Register Another Candidate
            </button>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <div className="glass-panel form-card">
          {statusMessage && (
            <div style={{
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
                  value={formData.houseName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* DOB */}
              <div className="form-group">
                <label className="form-label" htmlFor="dob">
                  Date of Birth (DOB) {dobOptional
                    ? <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional for Group events)</span>
                    : <span className="req">*</span>}
                </label>
                <DateInput
                  id="dob"
                  name="dob"
                  className="form-input"
                  value={formData.dob}
                  maxDate={new Date().toISOString().split('T')[0]}
                  onDateChange={value => handleChange({ target: { name: 'dob', value } })}
                  required={!dobOptional}
                />
                {formData.dob && (
                  <div style={{
                    marginTop: '0.45rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.65rem'
                  }}>
                    <span>🎯 <strong>Category Auto-Selected:</strong> <strong style={{ color: '#fbbf24' }}>{formData.section}</strong></span>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number <span className="req">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  name="phone"
                  className="form-input"
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
                </select>
              </div>

              {/* Section — auto-detected from DOB, read-only */}
              <div className="form-group">
                <label className="form-label">
                  Section / Category
                </label>
                {formData.section ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginTop: '0.35rem',
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(251, 191, 36, 0.07)',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                  }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fbbf24' }}>
                        {formData.section || '—'}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {formData.dob
                          ? 'Auto-assigned from Date of Birth · Cannot be changed manually'
                          : 'Assigned from selected Group event'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginTop: '0.35rem',
                    padding: '0.6rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(148,163,184,0.06)',
                    border: '1px dashed rgba(148,163,184,0.2)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                  }}>
                    {formData.dob
                      ? 'Category rules are loading; section events will appear shortly.'
                      : '📅 Please select a Date of Birth above — category will be assigned automatically.'}
                  </div>
                )}
                {/* Hidden input keeps the value in the form */}
                <input type="hidden" name="section" value={formData.section} />
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
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parish */}
              <div className="form-group">
                <label className="form-label" htmlFor="parish">
                  Parish <span className="req">*</span>
                </label>
                <select
                  id="parish"
                  name="parish"
                  className="form-select"
                  value={formData.parish}
                  onChange={handleChange}
                  required
                  disabled={!formData.mekhala}
                >
                  <option value="">
                    {formData.mekhala ? '-- Select Parish --' : '-- Choose Mekhala First --'}
                  </option>
                  {availableParishes.map(s => (
                    <option key={s._id || s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="event">
                  Event <span className="req">*</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                    ({eventAvailabilityText})
                  </span>
                </label>
                <select
                  id="event"
                  name="event"
                  className="form-select"
                  value={formData.event}
                  onChange={handleChange}
                  required
                  disabled={availableEvents.length === 0}
                >
                  <option value="">{eventPlaceholder}</option>
                  {availableEvents.map(ev => {
                    const catDisplay = formatEventCategories(ev);
                    const genderDisplay = formatEventGender(ev);
                    return (
                      <option key={ev._id || ev.name} value={ev.name}>
                        {ev.name} ({catDisplay} • {genderDisplay})
                      </option>
                    );
                  })}
                </select>
                {availableEvents.length === 0 && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                    ⚠️ {hasResolvedCategory
                      ? <>No events are configured for <strong>{formData.section} ({formData.sex})</strong>.</>
                      : 'No Group events are configured. Section events appear after category rules load and a DOB is selected.'}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ minWidth: '220px' }}
                disabled={loading || fetchingData}
              >
                {loading ? 'Submitting...' : 'Submit Registration 🚀'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
