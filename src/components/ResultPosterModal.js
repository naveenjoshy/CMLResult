'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatEventCategories, formatEventGender } from '@/lib/eventUtils';

export default function ResultPosterModal({ isOpen, onClose, event, candidates = [] }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Group winners
  const firstWinners = candidates.filter(c => c.position === 'First');
  const secondWinners = candidates.filter(c => c.position === 'Second');
  const thirdWinners = candidates.filter(c => c.position === 'Third');
  const hasWinners = firstWinners.length > 0 || secondWinners.length > 0 || thirdWinners.length > 0;

  // Render high-res Canvas poster
  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !event) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High resolution canvas: 1200 x 1500 (4:5 social media portrait ratio)
    const W = 1200;
    const H = 1500;
    canvas.width = W;
    canvas.height = H;

    // 1. Background: Deep rich midnight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#060913');
    bgGrad.addColorStop(0.3, '#0b1120');
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#05070f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative ambient glow spots
    const glow1 = ctx.createRadialGradient(W / 2, 220, 50, W / 2, 220, 500);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
    glow1.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, 700);

    const glow2 = ctx.createRadialGradient(W / 2, 800, 50, W / 2, 800, 600);
    glow2.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
    glow2.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 500, W, 1000);

    // 2. Dual Gold Ornate Border
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Corner decorative accents
    const corners = [
      [30, 30],
      [W - 30, 30],
      [30, H - 30],
      [W - 30, H - 30]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 3. Organization Header & Logo Pill
    ctx.textAlign = 'center';

    // Header badge
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    roundRect(ctx, W / 2 - 240, 65, 480, 38, 19, true, true);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('CHERUPUSHPAM MISSION LEAGUE (CML)', W / 2, 90);

    // Fest Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px "Space Grotesk", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('MEKHALA KALOTSAVAM', W / 2, 160);

    // Sub-banner: RESULT ANNOUNCEMENT
    const bannerGrad = ctx.createLinearGradient(W / 2 - 250, 0, W / 2 + 250, 0);
    bannerGrad.addColorStop(0, 'rgba(217, 119, 6, 0)');
    bannerGrad.addColorStop(0.2, '#d97706');
    bannerGrad.addColorStop(0.5, '#fbbf24');
    bannerGrad.addColorStop(0.8, '#d97706');
    bannerGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = bannerGrad;
    ctx.fillRect(W / 2 - 320, 185, 640, 36);

    ctx.fillStyle = '#111827';
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('★ OFFICIAL RESULT ANNOUNCEMENT ★', W / 2, 210);

    // 4. Event Name Box
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    const eventTitle = (event.name || 'Event Results').toUpperCase();
    ctx.fillText(eventTitle, W / 2, 275);

    // Event Meta Pill (Section & Gender)
    const catStr = formatEventCategories(event);
    const genStr = formatEventGender(event);
    const metaStr = `SECTION: ${catStr.toUpperCase()}  •  ELIGIBILITY: ${genStr.toUpperCase()}`;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(metaStr, W / 2, 310);

    // Horizontal divider
    const divGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    divGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    divGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)');
    divGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(120, 335, W - 240, 2);

    // 5. Winners Cards: 1st, 2nd, 3rd
    const startY = 360;
    const cardW = 1040;
    const cardX = (W - cardW) / 2;

    // Helper to draw a winner card
    function drawWinnerCard(y, tier, winners) {
      const isFirst = tier === 'first';
      const isSecond = tier === 'second';
      const isThird = tier === 'third';

      const cardH = 265;
      const count = winners.length;

      // Card Background
      let borderGrad, cardBg, badgeBg, badgeText, badgeColor, medalEmoji;
      if (isFirst) {
        borderGrad = '#f59e0b';
        cardBg = 'rgba(245, 158, 11, 0.08)';
        badgeBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
        badgeText = 'FIRST PLACE';
        badgeColor = '#fbbf24';
        medalEmoji = '🥇';
      } else if (isSecond) {
        borderGrad = '#94a3b8';
        cardBg = 'rgba(148, 163, 184, 0.06)';
        badgeText = 'SECOND PLACE';
        badgeColor = '#e2e8f0';
        medalEmoji = '🥈';
      } else {
        borderGrad = '#b45309';
        cardBg = 'rgba(180, 83, 9, 0.06)';
        badgeText = 'THIRD PLACE';
        badgeColor = '#fdba74';
        medalEmoji = '🥉';
      }

      ctx.save();

      // Card Outer border & shadow
      ctx.fillStyle = cardBg;
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = isFirst ? 2.5 : 1.5;
      roundRect(ctx, cardX, y, cardW, cardH, 16, true, true);

      // Left Pillar Badge
      const pillarW = 140;
      const pillarGrad = ctx.createLinearGradient(cardX, y, cardX + pillarW, y + cardH);
      if (isFirst) {
        pillarGrad.addColorStop(0, '#b45309');
        pillarGrad.addColorStop(0.5, '#d97706');
        pillarGrad.addColorStop(1, '#92400e');
      } else if (isSecond) {
        pillarGrad.addColorStop(0, '#475569');
        pillarGrad.addColorStop(0.5, '#64748b');
        pillarGrad.addColorStop(1, '#334155');
      } else {
        pillarGrad.addColorStop(0, '#78350f');
        pillarGrad.addColorStop(0.5, '#92400e');
        pillarGrad.addColorStop(1, '#451a03');
      }
      ctx.fillStyle = pillarGrad;
      roundRectLeft(ctx, cardX, y, pillarW, cardH, 16, true, false);

      // Medal emoji & rank text
      ctx.textAlign = 'center';
      ctx.font = '54px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.fillText(medalEmoji, cardX + pillarW / 2, y + 95);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 17px "Space Grotesk", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(badgeText, cardX + pillarW / 2, y + 145);

      if (isFirst) {
        ctx.fillStyle = '#fef08a';
        ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('WINNER', cardX + pillarW / 2, y + 170);
      }

      // Winners details area
      ctx.textAlign = 'left';
      const contentX = cardX + pillarW + 35;
      const contentW = cardW - pillarW - 60;

      if (count === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('— Result Awaited / No Winner —', contentX, y + 140);
      } else {
        // In case of ties or multiple winners in this spot
        const perWinnerH = cardH / count;
        winners.forEach((winner, idx) => {
          const rowY = y + (idx * perWinnerH) + (perWinnerH / 2);

          // Candidate Name
          ctx.fillStyle = '#ffffff';
          ctx.font = isFirst ? '800 36px "Space Grotesk", sans-serif' : '800 32px "Space Grotesk", sans-serif';
          const nameStr = winner.name || 'Candidate';
          ctx.fillText(nameStr, contentX, rowY - 25);

          // Chest No Pill
          const chestStr = `CHEST NO: ${winner.chestNo || '—'}`;
          ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
          const chestWidth = ctx.measureText(chestStr).width + 24;

          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1;
          roundRect(ctx, contentX, rowY - 14, chestWidth, 26, 6, true, true);

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(chestStr, contentX + 12, rowY + 5);

          // Sakha & Mekhala details
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
          const sakhaMekhala = `${winner.sakha || ''} • ${winner.mekhala || ''}`;
          ctx.fillText(sakhaMekhala, contentX, rowY + 55);

          // Grade & Points Pill on right
          ctx.textAlign = 'right';
          const rightEdge = cardX + cardW - 35;

          if (winner.grade && winner.grade !== 'None') {
            ctx.fillStyle = '#fbbf24';
            ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(`GRADE ${winner.grade}`, rightEdge, rowY - 10);
          }

          ctx.fillStyle = isFirst ? '#f59e0b' : '#38bdf8';
          ctx.font = '800 24px "Space Grotesk", sans-serif';
          ctx.fillText(`+${winner.totalPoints || 0} PTS`, rightEdge, rowY + 30);

          ctx.textAlign = 'left';
        });
      }

      ctx.restore();
    }

    // Draw 3 tiers
    drawWinnerCard(startY, 'first', firstWinners);
    drawWinnerCard(startY + 290, 'second', secondWinners);
    drawWinnerCard(startY + 580, 'third', thirdWinners);

    // 6. Poster Footer & Congratulations Banner
    const footerY = 1270;

    // Congratulatory Ribbon
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('💐 HEARTY CONGRATULATIONS TO ALL THE WINNERS! 💐', W / 2, footerY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Cherupushpam Mission League • Official Publication • CML Kalotsavam', W / 2, footerY + 35);

    // Timestamp & Certification
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Verified & Published on: ${currentDate} at ${currentTime} • CMLResult Portal`, W / 2, footerY + 70);

    // Security watermark seal
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 200, footerY + 95, 400, 28);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('OFFICIAL CERTIFIED RESULT RECORD', W / 2, footerY + 114);

  }, [event, candidates, firstWinners, secondWinners, thirdWinners]);

  // Redraw when modal opens or candidates change
  useEffect(() => {
    if (isOpen && event) {
      setTimeout(() => {
        drawPoster();
      }, 80);
    }
  }, [isOpen, event, drawPoster]);

  if (!isOpen || !event) return null;

  // Handle Download PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      const cleanEventName = (event.name || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const filename = `cml-kalotsavam-${cleanEventName}-winners-poster.png`;

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Handle Copy Image to Clipboard
  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }, 'image/png');
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  };

  return (
    <div className="print-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="print-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '96vh' }}
      >
        {/* Header Toolbar */}
        <div className="print-modal-header" style={{ padding: '0.9rem 1.4rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎨</span> Winner Announcement Poster
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {event.name} • Top 3 Positions (1st, 2nd, 3rd)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {copied ? '✅ Copied to Clipboard!' : '📋 Copy Image'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#fff',
                padding: '0.45rem 1.1rem'
              }}
            >
              {downloading ? '⏳ Generating...' : '⬇️ Download Poster (PNG)'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '0.45rem 0.8rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body / Live Canvas Preview */}
        <div
          className="print-modal-body"
          style={{
            background: '#070a14',
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          {!hasWinners && (
            <div style={{
              width: '100%',
              maxWidth: '540px',
              padding: '0.75rem 1rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              color: '#fef08a',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              ⚠️ <strong>Note:</strong> Winners (1st, 2nd, or 3rd) have not been fully assigned yet. The poster will show placeholder slots for unassigned ranks.
            </div>
          )}

          {/* Canvas Wrapper */}
          <div style={{
            maxWidth: '560px',
            width: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            background: '#060913',
            lineHeight: 0
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
            📱 High-resolution 1200x1500 (4:5) format • Optimized for WhatsApp Status, Instagram, and Printing.
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas rounded rectangle helper
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Canvas rounded left-only rectangle helper
function roundRectLeft(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
