'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BrandBanner from '@/components/BrandBanner';
import BrandLogo from '@/components/BrandLogo';

const CERTIFICATE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'houseName', label: 'House Name' },
  { key: 'mekhala', label: 'Mekhala' },
  { key: 'parish', label: 'Parish' },
  { key: 'event', label: 'Event' },
  { key: 'position', label: 'Position' },
  { key: 'grade', label: 'Grade' },
];

const DEFAULT_POSITIONS = {
  name: { x: 50, y: 43, fontSize: 27 },
  houseName: { x: 50, y: 53, fontSize: 15 },
  mekhala: { x: 50, y: 62, fontSize: 15 },
  parish: { x: 50, y: 69, fontSize: 15 },
  event: { x: 50, y: 76, fontSize: 18 },
  position: { x: 40, y: 86, fontSize: 16 },
  grade: { x: 60, y: 86, fontSize: 16 },
};

const EMPTY_DESIGN = {
  key: '',
  name: 'New Certificate Design',
  mode: 'blank',
  title: 'CERTIFICATE OF ACHIEVEMENT',
  subtitle: 'This certificate is proudly presented to',
  backgroundImage: '',
  fields: [],
};

function getFieldValue(candidate, fieldKey) {
  if (fieldKey === 'name') return candidate?.name || 'Candidate Name';
  if (fieldKey === 'houseName') return candidate?.houseName || 'House Name';
  if (fieldKey === 'mekhala') return candidate?.mekhala || 'Mekhala';
  if (fieldKey === 'parish') return candidate?.parish || 'Parish';
  if (fieldKey === 'event') return candidate?.event || 'Event';
  if (fieldKey === 'position') return candidate?.position && candidate.position !== 'None' ? candidate.position : 'Position';
  if (fieldKey === 'grade') return candidate?.grade && candidate.grade !== 'None' ? `Grade ${candidate.grade}` : 'Grade';
  return '';
}

function getCandidateId(candidate) {
  return String(candidate._id || candidate.id || candidate.name);
}

function CertificateBranding({ className, includeLogo, includeBanner, includeSecondaryBanner }) {
  if (!includeLogo && !includeBanner && !includeSecondaryBanner) return null;

  return (
    <div className={className}>
      {includeLogo && <BrandLogo className="certificate-branding-logo" />}
      {(includeBanner || includeSecondaryBanner) && (
        <BrandBanner
          className="certificate-branding-banners"
          showPrimary={includeBanner}
          showSecondary={includeSecondaryBanner}
        />
      )}
    </div>
  );
}

export default function CertificateDesigner({ candidates = [], events = [], initialEventName, initialCandidateIds }) {
  const previewRef = useRef(null);
  const dragStartRef = useRef(null);
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [design, setDesign] = useState(EMPTY_DESIGN);
  const [selectedEventName, setSelectedEventName] = useState(initialEventName || '');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [groupFieldKeys, setGroupFieldKeys] = useState([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState(null);
  const [activeDragField, setActiveDragField] = useState(null);
  const [loadingDesign, setLoadingDesign] = useState(true);
  const [savingDesign, setSavingDesign] = useState(false);
  const [notice, setNotice] = useState(null);
  const [includeCertificateLogo, setIncludeCertificateLogo] = useState(false);
  const [includeCertificateBanner, setIncludeCertificateBanner] = useState(false);
  const [includeCertificateSecondaryBanner, setIncludeCertificateSecondaryBanner] = useState(false);

  useEffect(() => {
    if (!initialEventName) return;
    setSelectedEventName(initialEventName);
    setSelectedCandidateIds((initialCandidateIds || []).map(String));
    setCandidateSearch('');
  }, [initialEventName, initialCandidateIds]);

  useEffect(() => {
    let active = true;
    fetch('/api/certificate-design')
      .then(response => response.json())
      .then(result => {
        if (active && result.success) {
          const designs = Array.isArray(result.data)
            ? result.data.map(savedDesign => ({ ...EMPTY_DESIGN, ...savedDesign, name: savedDesign.name || 'Default Certificate Design' }))
            : result.data
              ? [{ ...EMPTY_DESIGN, ...result.data, name: result.data.name || 'Default Certificate Design' }]
              : [];
          setSavedDesigns(designs);
          if (designs.length > 0) setDesign(designs[0]);
        }
      })
      .catch(() => {
        if (active) setNotice({ type: 'error', text: 'Could not load the saved certificate design.' });
      })
      .finally(() => {
        if (active) setLoadingDesign(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const eventCandidates = useMemo(() => {
    if (!selectedEventName) return [];
    return candidates.filter(candidate => candidate.event === selectedEventName);
  }, [candidates, selectedEventName]);

  const filteredCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    if (!query) return eventCandidates;
    return eventCandidates.filter(candidate =>
      [candidate.name, candidate.chestNo, candidate.event, candidate.parish, candidate.mekhala]
        .some(value => String(value || '').toLowerCase().includes(query))
    );
  }, [eventCandidates, candidateSearch]);

  const selectedCandidates = eventCandidates.filter(candidate => selectedCandidateIds.includes(getCandidateId(candidate)));
  const previewCandidate = selectedCandidates[0] || filteredCandidates[0] || null;

  const toggleCandidate = (candidate) => {
    const candidateId = getCandidateId(candidate);
    setSelectedCandidateIds(current => current.includes(candidateId)
      ? current.filter(id => id !== candidateId)
      : [...current, candidateId]);
  };

  const toggleField = (fieldKey) => {
    const existing = design.fields.find(field => field.key === fieldKey);
    if (existing) {
      setDesign(current => ({ ...current, fields: current.fields.filter(field => field.key !== fieldKey) }));
      setGroupFieldKeys(current => current.filter(key => key !== fieldKey));
      return;
    }

    const position = DEFAULT_POSITIONS[fieldKey];
    setDesign(current => ({
      ...current,
      fields: [...current.fields, {
        key: fieldKey,
        x: position.x,
        y: position.y,
        fontSize: position.fontSize,
        color: '#172033',
        align: 'center',
        groupId: '',
      }],
    }));
  };

  const updateField = (fieldKey, updates) => {
    setDesign(current => ({
      ...current,
      fields: current.fields.map(field => field.key === fieldKey ? { ...field, ...updates } : field),
    }));
  };

  const moveField = (event) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || !previewRef.current) return;
    const bounds = previewRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStart.pointerX) / bounds.width) * 100;
    const deltaY = ((event.clientY - dragStart.pointerY) / bounds.height) * 100;
    setDesign(current => ({
      ...current,
      fields: current.fields.map(field => {
        const startPosition = dragStart.positions[field.key];
        if (!startPosition) return field;
        return {
          ...field,
          x: Math.max(4, Math.min(96, startPosition.x + deltaX)),
          y: Math.max(8, Math.min(96, startPosition.y + deltaY)),
        };
      }),
    }));
  };

  const groupSelectedFields = () => {
    const selectedKeys = groupFieldKeys.filter(key => design.fields.some(field => field.key === key));
    if (selectedKeys.length < 2) return;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const selectedKeySet = new Set(selectedKeys);
    setDesign(current => ({
      ...current,
      fields: current.fields.map(field => selectedKeySet.has(field.key) ? { ...field, groupId } : field),
    }));
    setNotice({ type: 'success', text: `${selectedKeys.length} fields grouped. Drag any grouped field to move them together.` });
  };

  const ungroupSelectedFields = () => {
    const selectedKeySet = new Set(groupFieldKeys);
    const selectedGroupIds = new Set(
      design.fields.filter(field => selectedKeySet.has(field.key) && field.groupId).map(field => field.groupId)
    );
    if (selectedGroupIds.size === 0) return;
    setDesign(current => ({
      ...current,
      fields: current.fields.map(field => selectedGroupIds.has(field.groupId) ? { ...field, groupId: '' } : field),
    }));
    setNotice({ type: 'success', text: 'Selected fields ungrouped.' });
  };

  const clearDrag = () => {
    dragStartRef.current = null;
    setActiveDragField(null);
  };

  const handleBackgroundUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice({ type: 'error', text: 'Choose a PNG, JPEG, or WebP image.' });
      event.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Background images must be smaller than 3 MB.' });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDesign(current => ({
        ...current,
        mode: 'uploaded',
        backgroundImage: String(reader.result || ''),
      }));
      setNotice(null);
    };
    reader.onerror = () => setNotice({ type: 'error', text: 'Could not read that image.' });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveDesign = async () => {
    if (!design.name.trim()) {
      setNotice({ type: 'error', text: 'Enter a heading for this certificate design.' });
      return;
    }
    setSavingDesign(true);
    setNotice(null);
    const isExistingDesign = Boolean(design.key);
    try {
      const response = await fetch('/api/certificate-design', {
        method: isExistingDesign ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not save the certificate design.');
      }
      const savedDesign = { ...EMPTY_DESIGN, ...result.data };
      setDesign(savedDesign);
      setSavedDesigns(current => isExistingDesign
        ? current.map(item => item.key === savedDesign.key ? savedDesign : item)
        : [savedDesign, ...current]);
      setNotice({ type: 'success', text: isExistingDesign ? 'Certificate design updated.' : 'New certificate design saved.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not save the certificate design.' });
    } finally {
      setSavingDesign(false);
    }
  };

  const startNewDesign = () => {
    setDesign({ ...EMPTY_DESIGN });
    setGroupFieldKeys([]);
    setSelectedFieldKey(null);
    setNotice(null);
  };

  const selectedField = design.fields.find(field => field.key === selectedFieldKey) || design.fields[0];

  return (
    <div className="certificate-designer">
      <div className="certificate-controls">
        <div className="certificate-panel">
          <div className="certificate-panel-heading">
            <div>
              <h2>Certificate Design</h2>
              <p>Build one reusable layout for selected candidates.</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveDesign} disabled={savingDesign || loadingDesign}>
              {savingDesign ? 'Saving...' : design.key ? 'Save Changes' : 'Save New Design'}
            </button>
          </div>

          {notice && (
            <div className={`certificate-notice ${notice.type}`} role="status">{notice.text}</div>
          )}

          <div className="certificate-design-library">
            <label className="form-group">
              <span className="form-label">Saved designs</span>
              <select
                className="form-select"
                value={design.key || ''}
                onChange={event => {
                  const selectedDesign = savedDesigns.find(item => item.key === event.target.value);
                  if (selectedDesign) {
                    setDesign({ ...EMPTY_DESIGN, ...selectedDesign });
                    setGroupFieldKeys([]);
                    setSelectedFieldKey(null);
                    setNotice(null);
                  } else {
                    startNewDesign();
                  }
                }}
              >
                <option value="">New unsaved design</option>
                {savedDesigns.map(savedDesign => (
                  <option key={savedDesign.key} value={savedDesign.key}>{savedDesign.name}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={startNewDesign} disabled={loadingDesign}>
              New Design
            </button>
          </div>

          <label className="form-group">
            <span className="form-label">Design heading / name</span>
            <input
              className="form-input"
              value={design.name}
              maxLength={80}
              onChange={event => setDesign(current => ({ ...current, name: event.target.value }))}
            />
          </label>

          <fieldset className="certificate-mode-control">
            <legend>Design source</legend>
            <label>
              <input
                type="radio"
                name="certificate-mode"
                checked={design.mode === 'blank'}
                onChange={() => setDesign(current => ({ ...current, mode: 'blank' }))}
              />
              Blank design
            </label>
            <label>
              <input
                type="radio"
                name="certificate-mode"
                checked={design.mode === 'uploaded'}
                onChange={() => setDesign(current => ({ ...current, mode: 'uploaded' }))}
              />
              Uploaded background
            </label>
          </fieldset>

          {design.mode === 'uploaded' && (
            <div className="certificate-upload-control">
              <label className="form-label" htmlFor="certificate-background">Certificate background</label>
              <input
                id="certificate-background"
                className="form-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleBackgroundUpload}
              />
              <small>PNG, JPEG, or WebP; maximum 3 MB. The image is stored with the saved design.</small>
              {design.backgroundImage && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDesign(current => ({ ...current, backgroundImage: '' }))}>
                  Remove background
                </button>
              )}
            </div>
          )}

          <label className="form-group">
            <span className="form-label">Certificate title</span>
            <input className="form-input" value={design.title} maxLength={100} onChange={event => setDesign(current => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="form-group">
            <span className="form-label">Subtitle</span>
            <input className="form-input" value={design.subtitle} maxLength={160} onChange={event => setDesign(current => ({ ...current, subtitle: event.target.value }))} />
          </label>

          <div className="certificate-field-controls">
            <div className="certificate-control-title">Candidate fields</div>
            {CERTIFICATE_FIELDS.map(field => {
              const included = design.fields.some(item => item.key === field.key);
              return (
                <div className="certificate-field-control-row" key={field.key}>
                  <label className="certificate-field-toggle">
                    <input type="checkbox" checked={included} onChange={() => toggleField(field.key)} />
                    <span>{field.label}</span>
                  </label>
                  <label className="certificate-group-toggle" title={`Select ${field.label} to group it with other fields`}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${field.label} for grouping`}
                      checked={groupFieldKeys.includes(field.key)}
                      disabled={!included}
                      onChange={() => setGroupFieldKeys(current => current.includes(field.key)
                        ? current.filter(key => key !== field.key)
                        : [...current, field.key])}
                    />
                    <span>Group</span>
                  </label>
                </div>
              );
            })}
            <div className="certificate-group-actions">
              <span>{groupFieldKeys.length} selected for grouping</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={groupSelectedFields} disabled={groupFieldKeys.length < 2}>Group selected</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={ungroupSelectedFields} disabled={!design.fields.some(field => groupFieldKeys.includes(field.key) && field.groupId)}>Ungroup</button>
            </div>
          </div>

          {selectedField && (
            <div className="certificate-field-settings">
              <div className="certificate-control-title">Selected field style</div>
              <label>
                Field
                <select className="form-select" value={selectedField.key} onChange={event => setSelectedFieldKey(event.target.value)}>
                  {design.fields.map(field => (
                    <option key={field.key} value={field.key}>{CERTIFICATE_FIELDS.find(option => option.key === field.key)?.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Font size: {selectedField.fontSize}px
                <input type="range" min="8" max="48" value={selectedField.fontSize} onChange={event => updateField(selectedField.key, { fontSize: Number(event.target.value) })} />
              </label>
              <label>
                Text color
                <input type="color" value={selectedField.color} onChange={event => updateField(selectedField.key, { color: event.target.value })} />
              </label>
              <label>
                Alignment
                <select className="form-select" value={selectedField.align} onChange={event => updateField(selectedField.key, { align: event.target.value })}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="certificate-panel certificate-candidate-panel">
          <div className="certificate-panel-heading">
            <div>
              <h2>Print Certificates</h2>
              <p>{selectedCandidateIds.length} selected</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()} disabled={selectedCandidates.length === 0}>
              Print Selected ({selectedCandidates.length})
            </button>
          </div>
          <fieldset className="certificate-mode-control">
            <legend>Optional certificate branding</legend>
            <label>
              <input type="checkbox" checked={includeCertificateLogo} onChange={event => setIncludeCertificateLogo(event.target.checked)} />
              Logo
            </label>
            <label>
              <input type="checkbox" checked={includeCertificateBanner} onChange={event => setIncludeCertificateBanner(event.target.checked)} />
              Main banner
            </label>
            <label>
              <input type="checkbox" checked={includeCertificateSecondaryBanner} onChange={event => setIncludeCertificateSecondaryBanner(event.target.checked)} />
              Secondary banner
            </label>
          </fieldset>
          <label className="form-group">
            <span className="form-label">Event</span>
            <select
              className="form-select"
              value={selectedEventName}
              onChange={event => {
                setSelectedEventName(event.target.value);
                setSelectedCandidateIds([]);
              }}
            >
              <option value="">Select an event</option>
              {events.map(event => (
                <option key={event._id || event.name} value={event.name}>{event.name}</option>
              ))}
            </select>
          </label>
          <input
            className="form-input"
            type="search"
            aria-label="Search candidates for certificates"
            placeholder="Search name, chest number, or event"
            value={candidateSearch}
            onChange={event => setCandidateSearch(event.target.value)}
          />
          <div className="certificate-candidate-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedCandidateIds(eventCandidates.map(getCandidateId))}
              disabled={!selectedEventName || eventCandidates.length === 0}
            >
              Select all for event ({eventCandidates.length})
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedCandidateIds(current => Array.from(new Set([...current, ...filteredCandidates.map(getCandidateId)])))}>
              Select visible
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedCandidateIds([])} disabled={selectedCandidateIds.length === 0}>
              Clear selection
            </button>
          </div>
          <div className="certificate-candidate-list">
            {!selectedEventName ? (
              <p className="certificate-empty-state">Select an event to choose its candidates.</p>
            ) : filteredCandidates.length === 0 ? (
              <p className="certificate-empty-state">No candidates match this event and search.</p>
            ) : filteredCandidates.map(candidate => (
              <label key={getCandidateId(candidate)} className="certificate-candidate-option">
                <input type="checkbox" checked={selectedCandidateIds.includes(getCandidateId(candidate))} onChange={() => toggleCandidate(candidate)} />
                <span>
                  <strong>{candidate.name}</strong>
                  <small>{[candidate.chestNo, candidate.event].filter(Boolean).join(' · ')}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <section className="certificate-preview-section">
        <div className="certificate-preview-heading">
          <div>
            <h2>Live Preview</h2>
            <p>{previewCandidate ? `Previewing ${previewCandidate.name}` : 'Select an event and candidate to preview their details.'}</p>
          </div>
          {loadingDesign && <span className="certificate-loading">Loading saved design...</span>}
        </div>

        <div
          ref={previewRef}
          className={`certificate-preview ${design.mode === 'blank' ? 'blank' : 'uploaded'}`}
          style={design.mode === 'uploaded' && design.backgroundImage ? { backgroundImage: `url("${design.backgroundImage}")` } : undefined}
          onPointerMove={moveField}
          onPointerUp={clearDrag}
          onPointerCancel={clearDrag}
        >
          <CertificateBranding
            className="certificate-preview-branding"
            includeLogo={includeCertificateLogo}
            includeBanner={includeCertificateBanner}
            includeSecondaryBanner={includeCertificateSecondaryBanner}
          />
          {design.title && <div className="certificate-preview-title">{design.title}</div>}
          {design.subtitle && <div className="certificate-preview-subtitle">{design.subtitle}</div>}
          {design.fields.map(field => (
            <div
              key={field.key}
              className={`certificate-preview-field ${activeDragField === field.key ? 'dragging' : ''}`}
              style={{ left: `${field.x}%`, top: `${field.y}%`, color: field.color, fontSize: `clamp(10px, ${field.fontSize / 7.5}vw, ${field.fontSize}px)`, textAlign: field.align }}
              onPointerDown={event => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                const groupId = field.groupId;
                const groupedFields = groupId
                  ? design.fields.filter(item => item.groupId === groupId)
                  : [field];
                dragStartRef.current = {
                  pointerX: event.clientX,
                  pointerY: event.clientY,
                  positions: Object.fromEntries(groupedFields.map(item => [item.key, { x: item.x, y: item.y }])),
                };
                setSelectedFieldKey(field.key);
                setActiveDragField(field.key);
              }}
              onPointerUp={clearDrag}
            >
              {getFieldValue(previewCandidate, field.key)}
            </div>
          ))}
        </div>
      </section>

      <div id="certificate-print-area" aria-hidden="true">
        {selectedCandidates.map(candidate => (
          <article
            key={getCandidateId(candidate)}
            className={`certificate-print-page ${design.mode === 'blank' ? 'blank' : 'uploaded'}`}
            style={design.mode === 'uploaded' && design.backgroundImage ? { backgroundImage: `url("${design.backgroundImage}")` } : undefined}
          >
            <CertificateBranding
              className="certificate-print-branding"
              includeLogo={includeCertificateLogo}
              includeBanner={includeCertificateBanner}
              includeSecondaryBanner={includeCertificateSecondaryBanner}
            />
            {design.title && <div className="certificate-print-title">{design.title}</div>}
            {design.subtitle && <div className="certificate-print-subtitle">{design.subtitle}</div>}
            {design.fields.map(field => (
              <div
                key={field.key}
                className="certificate-print-field"
                style={{ left: `${field.x}%`, top: `${field.y}%`, color: field.color, fontSize: `${field.fontSize}pt`, textAlign: field.align }}
              >
                {getFieldValue(candidate, field.key)}
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}