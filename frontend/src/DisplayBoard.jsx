import React, { useEffect, useState, useRef } from 'react';

export default function DisplayBoard({ sessions }) {
  const [tick, setTick] = useState(0);
  const audioContext = useRef(null);
  const previouslyExpired = useRef(new Set());

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const playBeep = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContext.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      setTimeout(() => osc.stop(), 800);
    } catch(e) {}
  };

  const getStatusInfo = (session) => {
    if (session.status !== 'ACTIVE') return { text: '00:00', type: 'expired' };
    
    const now = Date.now();
    const diff = session.endTime - now;
    
    if (diff <= 0) {
      if (!previouslyExpired.current.has(session.id)) {
        previouslyExpired.current.add(session.id);
        playBeep();
      }
      return { text: '00:00', type: 'expired' };
    }
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const text = h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    if (h === 0 && m < 2 && diff > 0) return { text, type: 'warning' };
    return { text, type: 'active' };
  };

  const visibleSessions = sessions.filter(s => s.status === 'ACTIVE' || s.status === 'EXPIRED');

  // Play beep if received EXPIRED directly from backend
  useEffect(() => {
    visibleSessions.forEach(s => {
      if (s.status === 'EXPIRED' && !previouslyExpired.current.has(s.id)) {
        previouslyExpired.current.add(s.id);
        playBeep();
      }
    });
  }, [sessions, visibleSessions]);

  return (
    <div className="display-container">
      <div className="display-header" style={{ cursor: 'pointer' }} onClick={() => playBeep()}>
        <span role="img" aria-label="flag">🏁</span> RC TRACK BOARD <span role="img" aria-label="flag">🏁</span>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }}>
          *Click header to enable audio alert
        </div>
      </div>
      
      <div className="board-grid">
        {visibleSessions.map(session => {
          const { text, type } = getStatusInfo(session);
          
          return (
            <div key={session.id} className={`board-card ${type}`}>
              <div className="board-customer">{session.customerId}</div>
              <div className="board-time">{text}</div>
              <div className="board-rc">{session.rcId}</div>
            </div>
          );
        })}
        {visibleSessions.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '2rem', color: 'var(--text-muted)', marginTop: '4rem' }}>
            No active racers. Get ready to start!
          </div>
        )}
      </div>
    </div>
  );
}
