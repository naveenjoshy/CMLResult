'use client';

import BrandBanner from '@/components/BrandBanner';
import { formatDateDDMMYYYY } from '@/lib/dateUtils';

export default function CandidateRosterPrintModal({ isOpen, onClose, title, candidates = [] }) {
  if (!isOpen) return null;

  const sortedCandidates = [...candidates].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '') || (a.event || '').localeCompare(b.event || '')
  );

  return (
    <div className="print-modal-overlay no-print-bg" onClick={onClose}>
      <div className="print-modal-container" onClick={event => event.stopPropagation()}>
        <div className="print-modal-header no-print">
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Candidate List Preview</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
              Print List
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="print-modal-body">
          <div id="printable-sheet" className="paper-sheet a4-portrait">
            <img src="/logo.png" alt="" aria-hidden="true" className="print-watermark" />
            <div className="print-sheet-content">
              <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <BrandBanner className="print-brand-banner" />
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Candidate List • {title}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111827', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Sl No', 'Name', 'House Name', 'DOB', 'Category', 'Event Participating In'].map(heading => (
                    <th key={heading} style={{ border: '1px solid #9ca3af', padding: '0.45rem', textAlign: 'left' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ border: '1px solid #9ca3af', padding: '0.65rem', textAlign: 'center' }}>
                      No candidates registered.
                    </td>
                  </tr>
                ) : sortedCandidates.map((candidate, index) => (
                  <tr key={candidate._id || `${candidate.name}-${candidate.event}-${index}`}>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{candidate.name || '—'}</td>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{candidate.houseName || '—'}</td>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{formatDateDDMMYYYY(candidate.dob) || '—'}</td>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{candidate.section || '—'}</td>
                    <td style={{ border: '1px solid #9ca3af', padding: '0.4rem' }}>{candidate.event || '—'}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}