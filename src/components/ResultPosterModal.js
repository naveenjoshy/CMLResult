'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatEventCategories, formatEventGender } from '@/lib/eventUtils';

export default function ResultPosterModal({ isOpen, onClose, event, candidates = [] }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState('post'); // 'post' (4:5), 'story' (9:16), 'square' (1:1)
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Group winners
  const firstWinners = candidates.filter(c => c.position === 'First');
  const secondWinners = candidates.filter(c => c.position === 'Second');
  const thirdWinners = candidates.filter(c => c.position === 'Third');
  const hasWinners = firstWinners.length > 0 || secondWinners.length > 0 || thirdWinners.length > 0;

  // Generate Instagram caption / social media text
  const generateCaptionText = useCallback(() => {
    if (!event) return '';
    const firstNames = firstWinners.length > 0 
      ? firstWinners.map(w => `${w.name} (${w.sakha || ''}${w.chestNo ? `, Chest #${w.chestNo}` : ''})`).join(', ')
      : 'Result Awaited';
    const secondNames = secondWinners.length > 0 
      ? secondWinners.map(w => `${w.name} (${w.sakha || ''}${w.chestNo ? `, Chest #${w.chestNo}` : ''})`).join(', ')
      : 'Result Awaited';
    const thirdNames = thirdWinners.length > 0 
      ? thirdWinners.map(w => `${w.name} (${w.sakha || ''}${w.chestNo ? `, Chest #${w.chestNo}` : ''})`).join(', ')
      : 'Result Awaited';

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    return `🏆 *CML MEKHALA KALOTSAVAM - RESULT ANNOUNCEMENT* 🏆\n\n` +
      `🎪 *Event:* ${event.name}\n` +
      `🏷️ *Section:* ${formatEventCategories(event)} (${formatEventGender(event)})\n\n` +
      `🥇 *FIRST PLACE:* ${firstNames}\n` +
      `🥈 *SECOND PLACE:* ${secondNames}\n` +
      `🥉 *THIRD PLACE:* ${thirdNames}\n\n` +
      `💐 Hearty congratulations to all the winners!\n` +
      (origin ? `✨ View all fest results: ${origin}\n\n` : '\n') +
      `#CMLKalotsavam #CML #MekhalaKalotsavam #Kalotsavam2026 #Winners #FestResults`;
  }, [event, firstWinners, secondWinners, thirdWinners]);

  // Render high-res Canvas poster
  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !event) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions based on selected social media format
    // 'post': 1080 x 1350 (Instagram portrait 4:5 - optimal feed format)
    // 'story': 1080 x 1920 (Instagram / WhatsApp Story 9:16)
    // 'square': 1080 x 1080 (Square 1:1)
    let W = 1080;
    let H = 1350;
    if (format === 'story') {
      H = 1920;
    } else if (format === 'square') {
      H = 1080;
    }

    canvas.width = W;
    canvas.height = H;

    // 1. Background: Deep rich midnight navy gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#060914');
    bgGrad.addColorStop(0.3, '#0b1226');
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#05070e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative ambient radial glow spots
    const glow1 = ctx.createRadialGradient(W / 2, 200, 30, W / 2, 200, 480);
    glow1.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    glow1.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, 600);

    const glow2 = ctx.createRadialGradient(W / 2, H * 0.6, 50, W / 2, H * 0.6, 550);
    glow2.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    glow2.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, H * 0.3, W, H * 0.7);

    // Decorative festive confetti particles
    const particles = [
      { x: 90, y: 120, r: 3, c: '#fbbf24' },
      { x: 160, y: 220, r: 2.5, c: '#60a5fa' },
      { x: 240, y: 150, r: 4, c: '#f43f5e' },
      { x: W - 100, y: 140, r: 3, c: '#34d399' },
      { x: W - 180, y: 240, r: 2.5, c: '#fbbf24' },
      { x: W - 250, y: 170, r: 4, c: '#a855f7' },
      { x: 70, y: H - 200, r: 3.5, c: '#38bdf8' },
      { x: 150, y: H - 120, r: 2.5, c: '#fbbf24' },
      { x: W - 90, y: H - 220, r: 3, c: '#f43f5e' },
      { x: W - 160, y: H - 110, r: 3.5, c: '#34d399' },
    ];
    particles.forEach(p => {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Dual Gold Ornate Border
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(26, 26, W - 52, H - 52);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.strokeRect(34, 34, W - 68, H - 68);

    // Corner decorative accents
    const corners = [
      [26, 26],
      [W - 26, 26],
      [26, H - 26],
      [W - 26, H - 26]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 3. Organization Header & Title
    ctx.textAlign = 'center';

    let curY = format === 'story' ? 120 : (format === 'square' ? 55 : 75);

    // Top Pill: Cherupushpa Mission League
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    const badgeW = 440;
    roundRect(ctx, W / 2 - badgeW / 2, curY, badgeW, 34, 17, true, true);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('CHERUPUSHPAM MISSION LEAGUE (CML)', W / 2, curY + 22);

    curY += format === 'story' ? 70 : (format === 'square' ? 48 : 55);

    // Fest Main Title
    ctx.fillStyle = '#ffffff';
    ctx.font = format === 'square' ? '800 38px "Space Grotesk", sans-serif' : '800 44px "Space Grotesk", sans-serif';
    ctx.fillText('MEKHALA KALOTSAVAM', W / 2, curY);

    curY += format === 'story' ? 45 : (format === 'square' ? 34 : 38);

    // Sub-banner: OFFICIAL RESULT ANNOUNCEMENT
    const bannerW = format === 'square' ? 540 : 580;
    const bannerGrad = ctx.createLinearGradient(W / 2 - bannerW / 2, 0, W / 2 + bannerW / 2, 0);
    bannerGrad.addColorStop(0, 'rgba(217, 119, 6, 0)');
    bannerGrad.addColorStop(0.2, '#d97706');
    bannerGrad.addColorStop(0.5, '#fbbf24');
    bannerGrad.addColorStop(0.8, '#d97706');
    bannerGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = bannerGrad;
    ctx.fillRect(W / 2 - bannerW / 2, curY, bannerW, 32);

    ctx.fillStyle = '#111827';
    ctx.font = '800 15px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('★ OFFICIAL RESULT ANNOUNCEMENT ★', W / 2, curY + 22);

    curY += format === 'story' ? 65 : (format === 'square' ? 48 : 55);

    // 4. Event Name Box
    ctx.fillStyle = '#f8fafc';
    ctx.font = format === 'square' ? 'bold 30px "Space Grotesk", sans-serif' : 'bold 34px "Space Grotesk", sans-serif';
    const eventTitle = (event.name || 'Event Results').toUpperCase();
    ctx.fillText(eventTitle, W / 2, curY);

    curY += format === 'story' ? 36 : (format === 'square' ? 28 : 32);

    // Event Meta (Section & Eligibility)
    const catStr = formatEventCategories(event);
    const genStr = formatEventGender(event);
    const metaStr = `SECTION: ${catStr.toUpperCase()}   •   ELIGIBILITY: ${genStr.toUpperCase()}`;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(metaStr, W / 2, curY);

    curY += format === 'story' ? 26 : (format === 'square' ? 18 : 22);

    // Gold divider line
    const divGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    divGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    divGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
    divGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(120, curY, W - 240, 2);

    curY += format === 'story' ? 40 : (format === 'square' ? 20 : 26);

    // 5. Winners Cards: 1st, 2nd, 3rd
    const cardW = W - 120;
    const cardX = 60;
    
    // Calculate card height and spacing depending on aspect ratio
    let cardH = 220;
    let cardGap = 24;

    if (format === 'story') {
      cardH = 310;
      cardGap = 35;
    } else if (format === 'square') {
      cardH = 175;
      cardGap = 16;
    }

    // Helper to draw a winner card
    function drawWinnerCard(y, tier, winners) {
      const isFirst = tier === 'first';
      const isSecond = tier === 'second';
      const isThird = tier === 'third';

      const count = winners.length;

      // Card Background & Colors
      let borderGrad, cardBg, badgeText, medalEmoji, crownEmoji;
      if (isFirst) {
        borderGrad = '#f59e0b';
        cardBg = 'rgba(245, 158, 11, 0.09)';
        badgeText = 'FIRST PLACE';
        medalEmoji = '🥇';
        crownEmoji = '👑';
      } else if (isSecond) {
        borderGrad = '#94a3b8';
        cardBg = 'rgba(148, 163, 184, 0.07)';
        badgeText = 'SECOND PLACE';
        medalEmoji = '🥈';
        crownEmoji = '';
      } else {
        borderGrad = '#b45309';
        cardBg = 'rgba(180, 83, 9, 0.07)';
        badgeText = 'THIRD PLACE';
        medalEmoji = '🥉';
        crownEmoji = '';
      }

      ctx.save();

      // Card Container & Border
      ctx.fillStyle = cardBg;
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = isFirst ? 2.5 : 1.5;
      roundRect(ctx, cardX, y, cardW, cardH, 16, true, true);

      // Left Pillar Badge
      const pillarW = format === 'square' ? 120 : 135;
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

      // Medal emoji & rank badge
      ctx.textAlign = 'center';
      const medalY = y + (cardH * 0.38);
      ctx.font = format === 'square' ? '42px sans-serif' : '50px sans-serif';
      ctx.fillText(medalEmoji, cardX + pillarW / 2, medalY);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 14px "Space Grotesk", sans-serif';
      ctx.fillText(badgeText, cardX + pillarW / 2, medalY + 36);

      if (isFirst) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText('★ WINNER ★', cardX + pillarW / 2, medalY + 56);
      }

      // Winners details area
      ctx.textAlign = 'left';
      const contentX = cardX + pillarW + 30;

      if (count === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 18px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText('— Position Awaited / No Winner —', contentX, y + cardH / 2 + 6);
      } else {
        const perWinnerH = cardH / count;
        winners.forEach((winner, idx) => {
          const rowY = y + (idx * perWinnerH) + (perWinnerH / 2);

          // Candidate Name
          ctx.fillStyle = '#ffffff';
          ctx.font = isFirst 
            ? (format === 'square' ? '800 26px "Space Grotesk", sans-serif' : '800 32px "Space Grotesk", sans-serif')
            : (format === 'square' ? '800 23px "Space Grotesk", sans-serif' : '800 28px "Space Grotesk", sans-serif');
          
          const nameStr = (winner.name || 'Candidate') + (isFirst && crownEmoji ? ` ${crownEmoji}` : '');
          ctx.fillText(nameStr, contentX, rowY - (format === 'square' ? 12 : 20));

          // Chest No Tag
          const chestStr = `CHEST NO: ${winner.chestNo || '—'}`;
          ctx.font = 'bold 13px "Plus Jakarta Sans", system-ui, sans-serif';
          const chestWidth = ctx.measureText(chestStr).width + 20;

          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1;
          roundRect(ctx, contentX, rowY - 5, chestWidth, 24, 6, true, true);

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(chestStr, contentX + 10, rowY + 12);

          // Sakha & Mekhala details
          ctx.fillStyle = '#cbd5e1';
          ctx.font = format === 'square' ? '600 16px "Plus Jakarta Sans", system-ui, sans-serif' : '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
          const sakhaMekhala = `${winner.sakha || ''} • ${winner.mekhala || ''}`;
          ctx.fillText(sakhaMekhala, contentX, rowY + (format === 'square' ? 36 : 46));

          // Grade & Points on the right edge
          ctx.textAlign = 'right';
          const rightEdge = cardX + cardW - 30;

          if (winner.grade && winner.grade !== 'None') {
            ctx.fillStyle = '#fbbf24';
            ctx.font = '800 15px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.fillText(`GRADE ${winner.grade}`, rightEdge, rowY - (format === 'square' ? 5 : 8));
          }

          ctx.fillStyle = isFirst ? '#f59e0b' : '#38bdf8';
          ctx.font = format === 'square' ? '800 20px "Space Grotesk", sans-serif' : '800 24px "Space Grotesk", sans-serif';
          ctx.fillText(`+${winner.totalPoints || 0} PTS`, rightEdge, rowY + (format === 'square' ? 24 : 26));

          ctx.textAlign = 'left';
        });
      }

      ctx.restore();
    }

    // Draw 3 tiers sequentially
    drawWinnerCard(curY, 'first', firstWinners);
    curY += cardH + cardGap;

    drawWinnerCard(curY, 'second', secondWinners);
    curY += cardH + cardGap;

    drawWinnerCard(curY, 'third', thirdWinners);
    curY += cardH + (format === 'story' ? 45 : (format === 'square' ? 18 : 25));

    // 6. Poster Footer & Congratulations Banner
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = format === 'square' ? '800 18px "Space Grotesk", sans-serif' : '800 21px "Space Grotesk", sans-serif';
    ctx.fillText('💐 HEARTY CONGRATULATIONS TO ALL WINNERS! 💐', W / 2, curY);

    curY += format === 'story' ? 36 : (format === 'square' ? 22 : 28);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Cherupushpam Mission League • Official Publication • CML Kalotsavam', W / 2, curY);

    curY += format === 'story' ? 34 : (format === 'square' ? 20 : 26);

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`Verified on: ${currentDate}, ${currentTime} • CMLResult Official Portal`, W / 2, curY);

    if (format === 'story') {
      curY += 36;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 180, curY, 360, 28);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('OFFICIAL CERTIFIED RESULT RECORD', W / 2, curY + 18);
    }

  }, [event, format, firstWinners, secondWinners, thirdWinners]);

  // Redraw when modal opens, format changes, or event changes
  useEffect(() => {
    if (isOpen && event) {
      setTimeout(() => {
        drawPoster();
      }, 60);
    }
  }, [isOpen, event, format, drawPoster]);

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
      const filename = `cml-kalotsavam-${cleanEventName}-${format}-poster.png`;

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

  // Handle Native Social Share (Instagram, WhatsApp, Facebook, etc.)
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const cleanName = (event.name || 'event').replace(/[^a-zA-Z0-9]/g, '_');
        const file = new File([blob], `CML_${cleanName}_Result_${format}.png`, { type: 'image/png' });
        
        const shareData = {
          title: `${event.name} Results - CML Kalotsavam`,
          text: `🎉 Official Results of ${event.name} at CML Kalotsavam! Congratulations to all winners! 🏆`,
          files: [file],
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share(shareData);
        } else if (navigator.share) {
          // If browser can't share files directly, share text + URL
          await navigator.share({
            title: shareData.title,
            text: shareData.text,
            url: window.location.origin,
          });
        } else {
          // Fallback to clipboard copy
          handleCopy();
        }
      }, 'image/png');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  // Handle WhatsApp Quick Share
  const handleWhatsAppShare = () => {
    const text = generateCaptionText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Handle Copy Caption Text
  const handleCopyCaption = async () => {
    try {
      const text = generateCaptionText();
      await navigator.clipboard.writeText(text);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 3000);
    } catch (err) {
      console.error('Copy caption failed:', err);
    }
  };

  return (
    <div className="print-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="print-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', maxHeight: '96vh' }}
      >
        {/* Header Toolbar */}
        <div className="print-modal-header" style={{ padding: '0.85rem 1.4rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📸</span> Social Media Result Poster
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {event.name} • Ready to share on Instagram, WhatsApp & Social Media
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '0.45rem 0.8rem' }}
          >
            ✕
          </button>
        </div>

        {/* Social Format Selector Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.6rem 1.4rem',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Format:</span>
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setFormat('post')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: format === 'post' ? 'linear-gradient(135deg, #e1306c, #f77737)' : 'transparent',
                  color: format === 'post' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📸</span> Instagram Post (4:5)
              </button>
              <button
                type="button"
                onClick={() => setFormat('story')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: format === 'story' ? 'linear-gradient(135deg, #833ab4, #fd1d1d)' : 'transparent',
                  color: format === 'story' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📱</span> Story / Status (9:16)
              </button>
              <button
                type="button"
                onClick={() => setFormat('square')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: format === 'square' ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'transparent',
                  color: format === 'square' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🔲</span> Square (1:1)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyCaption}
              title="Copy formatted results caption to paste on Instagram or WhatsApp"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
            >
              {copiedCaption ? '✅ Caption Copied!' : '📝 Copy Caption'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleWhatsAppShare}
              title="Open WhatsApp with results summary"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.65rem',
                background: 'rgba(37, 211, 102, 0.15)',
                color: '#25d366',
                border: '1px solid rgba(37, 211, 102, 0.3)'
              }}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        {/* Modal Body / Live Canvas Preview */}
        <div
          className="print-modal-body"
          style={{
            background: '#070a14',
            padding: '1.25rem',
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
            maxWidth: format === 'story' ? '380px' : (format === 'square' ? '500px' : '460px'),
            width: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            background: '#060914',
            lineHeight: 0,
            transition: 'max-width 0.2s ease'
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

          {/* Social Share & Export Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '650px',
            padding: '0.5rem 0'
          }}>
            {/* Primary Action: Direct Share to Instagram / Social apps */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNativeShare}
              disabled={sharing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #e1306c, #833ab4)',
                border: 'none',
                color: '#fff',
                padding: '0.55rem 1.25rem',
                boxShadow: '0 4px 15px rgba(225, 48, 108, 0.35)'
              }}
            >
              <span>📲</span> {sharing ? 'Sharing...' : 'Share to Instagram / Social'}
            </button>

            {/* Action 2: Copy Image to Clipboard */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                padding: '0.55rem 1rem'
              }}
            >
              <span>📋</span> {copied ? '✅ Image Copied!' : 'Copy Image'}
            </button>

            {/* Action 3: Download High-Res PNG */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                padding: '0.55rem 1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#fff',
                fontWeight: 600
              }}
            >
              <span>⬇️</span> {downloading ? 'Downloading...' : 'Download PNG'}
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 <strong>Tip:</strong> Choose <strong>Instagram Post (4:5)</strong> for feed posting, or <strong>Story / Status (9:16)</strong> for Instagram Stories and WhatsApp Status. Use <strong>Copy Caption</strong> to get pre-formatted text with hashtags!
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
