'use client';

import { useState, useEffect } from 'react';
import { formatEventCategories, formatEventGender } from '@/lib/eventUtils';

export default function PrintSheetModal({ isOpen, onClose, initialType = 'stage', event, candidates = [] }) {
  const [sheetType, setSheetType] = useState(initialType); // 'stage' or 'result'

  useEffect(() => {
    if (initialType) {
      setSheetType(initialType);
    }
  }, [initialType, isOpen]);

  if (!isOpen || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to extract number from chest number for natural sorting (e.g. "CML-12" -> 12)
  const getChestNum = (chestNo) => {
    if (!chestNo) return 999999;
    const match = chestNo.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999999;
  };

  // Candidates for Stage Manager List: sorted by Chest Number
  const stageCandidates = [...candidates].sort((a, b) => {
    const numA = getChestNum(a.chestNo);
    const numB = getChestNum(b.chestNo);
    if (numA !== numB) return numA - numB;
    return (a.chestNo || '').localeCompare(b.chestNo || '');
  });

  // Position priority helper
  const getPosPriority = (pos) => {
    if (pos === 'First') return 1;
    if (pos === 'Second') return 2;
    if (pos === 'Third') return 3;
    return 4;
  };

  // Candidates for Result Sheet: sorted by Position first, then Points, then Name
  const resultCandidates = [...candidates].sort((a, b) => {
    const posA = getPosPriority(a.position);
    const posB = getPosPriority(b.position);
    if (posA !== posB) return posA - posB;
    if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const firstPlace = candidates.filter(c => c.position === 'First');
  const secondPlace = candidates.filter(c => c.position === 'Second');
  const thirdPlace = candidates.filter(c => c.position === 'Third');

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="print-modal-overlay no-print-bg" onClick={onClose}>
      <div className="print-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Toolbar (Hidden during browser print) */}
        <div className="print-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
              🖨️ Document Print Preview
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${sheetType === 'stage' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setSheetType('stage')}
              >
                📋 Stage Manager Call Sheet
              </button>
              <button
                type="button"
                className={`btn btn-sm ${sheetType === 'result' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setSheetType('result')}
              >
                🏆 Official Result Sheet
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 600, padding: '0.45rem 1.1rem', fontSize: '0.88rem' }}
              onClick={handlePrint}
            >
              🖨️ Print Document
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              title="Close Preview"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="print-modal-body">
          {/* Printable Document Container */}
          <div id="printable-sheet" className="paper-sheet">
            {/* Top Official Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.12em', color: '#4b5563', textTransform: 'uppercase' }}>
                Cherupushpa Mission League (CML)
              </div>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0.2rem 0', color: '#111827', letterSpacing: '-0.02em' }}>
                CML ANNUAL FESTIVAL
              </h1>
              <div style={{
                display: 'inline-block',
                background: sheetType === 'stage' ? '#1f2937' : '#047857',
                color: '#ffffff',
                padding: '0.2rem 0.9rem',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.88rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginTop: '0.35rem'
              }}>
                {sheetType === 'stage' ? 'STAGE MANAGER PARTICIPANT CALL SHEET' : 'OFFICIAL EVENT RESULT SHEET'}
              </div>
            </div>

            {/* Event Metadata Card */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              color: '#374151'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem 1rem' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>EVENT NAME</span>
                  <strong style={{ fontSize: '1.05rem', color: '#111827' }}>{event.name}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>SECTION / CATEGORY</span>
                  <strong style={{ color: '#111827' }}>{formatEventCategories(event)}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>ELIGIBILITY</span>
                  <strong style={{ color: '#111827' }}>{formatEventGender(event)}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>TOTAL CANDIDATES</span>
                  <strong style={{ color: '#111827' }}>{candidates.length} registered</strong>
                </div>
                {sheetType === 'stage' ? (
                  <>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>STAGE / VENUE</span>
                      <span style={{ color: '#9ca3af' }}>__________________</span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>TIME / SESSION</span>
                      <span style={{ color: '#9ca3af' }}>__________________</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>STATUS</span>
                      <strong style={{ color: event.status === 'Completed' ? '#059669' : '#d97706' }}>
                        {event.status || 'Completed'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem', display: 'block' }}>DATE & TIME</span>
                      <span style={{ color: '#111827' }}>{currentDate} • {currentTime}</span>
                    </div>
                  </>
                )}
              </div>

              {sheetType === 'result' && (
                <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed #d1d5db', fontSize: '0.78rem', color: '#6b7280' }}>
                  <strong>Points Formula:</strong> 1st: {event.points?.first ?? 5} pts | 2nd: {event.points?.second ?? 3} pts | 3rd: {event.points?.third ?? 1} pts | Grade A: +{event.points?.gradeA ?? 5} pts | Grade B: +{event.points?.gradeB ?? 3} pts | Grade C: +{event.points?.gradeC ?? 1} pts
                </div>
              )}
            </div>

            {/* SHEET 1: STAGE MANAGER PARTICIPANT CALL SHEET */}
            {sheetType === 'stage' && (
              <div>
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Serial No.</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Chest Number</th>
                      <th style={{ width: '220px' }}>Name</th>
                      <th style={{ width: '170px' }}>Parish / Mekhala</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                          No candidates registered for this event.
                        </td>
                      </tr>
                    ) : (
                      stageCandidates.map((c, idx) => (
                        <tr key={c._id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#4b5563' }}>
                            {idx + 1}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                            {c.chestNo || '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{c.name}</div>
                            {c.houseName && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.houseName}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#374151' }}>{c.parish}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.mekhala}</div>
                          </td>
                          <td style={{ minHeight: '36px' }}>
                            {/* Blank line for stage manager remarks */}
                            <div style={{ borderBottom: '1px dotted #9ca3af', height: '22px', width: '100%' }}></div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Stage Manager Sheet Signature Footer */}
                <div style={{
                  marginTop: '3.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0 1rem',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}>
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>Stage Manager Signature</strong>
                  </div>
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>Call Desk In-Charge</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SHEET 2: OFFICIAL EVENT RESULT SHEET */}
            {sheetType === 'result' && (
              <div>
                {/* Winners Summary Podium Box */}
                {(firstPlace.length > 0 || secondPlace.length > 0 || thirdPlace.length > 0) && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🥇</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>FIRST PLACE</div>
                      {firstPlace.length > 0 ? firstPlace.map(w => (
                        <div key={w._id} style={{ marginTop: '0.25rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#111827', display: 'block' }}>{w.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#78350f' }}>Chest: {w.chestNo} • {w.parish}</span>
                        </div>
                      )) : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>None</span>}
                    </div>

                    <div style={{
                      background: '#f1f5f9',
                      border: '1px solid #94a3b8',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🥈</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>SECOND PLACE</div>
                      {secondPlace.length > 0 ? secondPlace.map(w => (
                        <div key={w._id} style={{ marginTop: '0.25rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#111827', display: 'block' }}>{w.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#334155' }}>Chest: {w.chestNo} • {w.parish}</span>
                        </div>
                      )) : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>None</span>}
                    </div>

                    <div style={{
                      background: '#ffedd5',
                      border: '1px solid #fb923c',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🥉</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase' }}>THIRD PLACE</div>
                      {thirdPlace.length > 0 ? thirdPlace.map(w => (
                        <div key={w._id} style={{ marginTop: '0.25rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#111827', display: 'block' }}>{w.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>Chest: {w.chestNo} • {w.parish}</span>
                        </div>
                      )) : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>None</span>}
                    </div>
                  </div>
                )}

                {/* Full Result Table */}
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>Sl</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Position</th>
                      <th style={{ width: '85px', textAlign: 'center' }}>Chest No</th>
                      <th>Candidate Name</th>
                      <th>Parish</th>
                      <th>Mekhala</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Grade</th>
                      <th style={{ width: '70px', textAlign: 'right' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                          No candidates or results recorded for this event.
                        </td>
                      </tr>
                    ) : (
                      resultCandidates.map((c, idx) => (
                        <tr key={c._id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>
                            {idx + 1}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {c.position === 'First' ? (
                              <span style={{ color: '#b45309', fontWeight: 800 }}>🥇 1st</span>
                            ) : c.position === 'Second' ? (
                              <span style={{ color: '#475569', fontWeight: 800 }}>🥈 2nd</span>
                            ) : c.position === 'Third' ? (
                              <span style={{ color: '#c2410c', fontWeight: 800 }}>🥉 3rd</span>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>
                            {c.chestNo || '—'}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{c.name}</div>
                            {c.houseName && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.houseName}</div>
                            )}
                          </td>
                          <td>{c.parish}</td>
                          <td>{c.mekhala}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {c.grade && c.grade !== 'None' ? c.grade : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                            {c.totalPoints ?? 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Certification & Signatures */}
                <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#4b5563', fontStyle: 'italic', textAlign: 'center' }}>
                  Certified that the results above have been verified and tallied with the official judges&apos; scoring sheets.
                </div>

                <div style={{
                  marginTop: '3.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '2rem',
                  padding: '0 1rem',
                  fontSize: '0.82rem',
                  color: '#374151'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>Judge 1 Signature</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>Judge 2 Signature</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>Convenor / Chief Judge</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Document Footer Metadata */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#9ca3af'
            }}>
              <span>CML Results Portal • Live Festival Management System</span>
              <span>Generated: {currentDate} {currentTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
