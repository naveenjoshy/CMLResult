'use client';

import { useState, useEffect } from 'react';
import BrandBanner from '@/components/BrandBanner';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

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

  // Candidates with chest numbers come first; unnumbered entries use Mekhala order.
  const stageCandidates = [...candidates].sort((a, b) => {
    const chestA = (a.chestNo || '').trim();
    const chestB = (b.chestNo || '').trim();
    if (chestA && chestB) {
      return chestA.localeCompare(chestB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (chestA) return -1;
    if (chestB) return 1;
    return (a.mekhala || '').localeCompare(b.mekhala || '', undefined, { sensitivity: 'base' }) ||
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  // Candidates for Result Sheet: sorted by points descending, then name.
  const resultCandidates = [...candidates].sort((a, b) => {
    const pointsDifference = (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0);
    if (pointsDifference) {
      return pointsDifference;
    }
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  const firstPlace = candidates.filter(c => c.position === 'First');
  const secondPlace = candidates.filter(c => c.position === 'Second');
  const thirdPlace = candidates.filter(c => c.position === 'Third');

  const currentDate = formatDateDDMMYYYY(new Date());
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
          <div id="printable-sheet" className="paper-sheet a4-landscape">
            {sheetType === 'result' && <img src="/logo.png" alt="" aria-hidden="true" className="print-watermark" />}
            <div className="print-sheet-content">
              {/* Top Official Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <BrandBanner className="print-brand-banner" />
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
                {sheetType === 'stage' ? 'STAGE MANAGER PARTICIPANT CALL SHEET' : 'OFFICIAL RESULT'}
              </div>
              </div>

            <div style={{
              marginBottom: '1.25rem',
              color: '#111827',
              fontSize: '28px',
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: 'center',
            }}>
              {event.name}
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
                            {c.chestNo || ''}
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
                          <span style={{ fontSize: '0.8rem', color: '#78350f' }}>{w.mekhala}</span>
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
                          <span style={{ fontSize: '0.8rem', color: '#334155' }}>{w.mekhala}</span>
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
                          <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>{w.mekhala}</span>
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
                            {c.chestNo || ''}
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

              </div>
            )}

              {sheetType === 'result' && (
                <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: '#6b7280' }}>
                  <strong>Points Formula:</strong> 1st: {event.points?.first ?? 5} pts | 2nd: {event.points?.second ?? 3} pts | 3rd: {event.points?.third ?? 1} pts | Grade A: +{event.points?.gradeA ?? 5} pts | Grade B: +{event.points?.gradeB ?? 3} pts | Grade C: +{event.points?.gradeC ?? 1} pts
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
                {sheetType === 'stage' && <span>CML Results Portal • Live Festival Management System</span>}
                <span>Generated: {currentDate} {currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
