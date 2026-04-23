import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, StopCircle, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Haptics } from '@capacitor/haptics';

export default function AdminDashboard() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('rc_sessions');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  
  const [customerId, setCustomerId] = useState('');
  const [rcId, setRcId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [tick, setTick] = useState(0);
  
  // Custom modal state
  const [modalConfig, setModalConfig] = useState(null);
  
  // Inline form error
  const [formError, setFormError] = useState('');

  const audioContext = useRef(null);
  const previouslyExpired = useRef(new Set());

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('rc_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      // Auto-expire sessions smoothly
      setSessions(prev => {
        let changed = false;
        const now = Date.now();
        const updated = prev.map(s => {
          if (s.status === 'ACTIVE' && now >= s.endTime) {
            changed = true;
            return { ...s, status: 'EXPIRED' };
          }
          return s;
        });
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const playBeep = async () => {
    try {
      if (typeof Haptics !== 'undefined') {
        const vibrateSeq = async () => {
          for(let i=0; i<3; i++) {
            await Haptics.vibrate({ duration: 400 });
            await new Promise(r => setTimeout(r, 200));
          }
        };
        vibrateSeq();
      } else if (navigator.vibrate) {
        navigator.vibrate([400, 200, 400, 200, 800]);
      }
      
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      const ctx = audioContext.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square'; // Extremely loud cutting alarm siren
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.9);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 1.2);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 1.5);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.1); 
      gain.gain.setValueAtTime(0.7, ctx.currentTime + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.0);
    } catch(e) {
      console.log('Audio/Haptic error', e);
    }
  };

  // Play beep if EXPIRED
  useEffect(() => {
    const visibleSessions = sessions.filter(s => s.status === 'EXPIRED');
    visibleSessions.forEach(s => {
      if (!previouslyExpired.current.has(s.id)) {
        previouslyExpired.current.add(s.id);
        playBeep();
      }
    });
  }, [sessions]);

  const handleCreate = (e) => {
    e.preventDefault();
    initAudio();
    if (!customerId || !rcId) {
      setFormError('Please enter both Cust ID and RC Unit to start a session.');
      return;
    }
    setFormError('');

    const newSession = {
      id: Date.now().toString(),
      customerId,
      rcId,
      startTime: Date.now(),
      durationMinutes,
      endTime: Date.now() + durationMinutes * 60 * 1000,
      status: 'ACTIVE'
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCustomerId('');
    setRcId('');
  };

  const handleExtend = (id) => {
    setModalConfig({
      type: 'prompt',
      title: 'Extend Session Time',
      message: 'Extend this session by how many minutes?',
      defaultValue: 5,
      confirmText: 'Extend',
      onConfirm: (val) => {
        const mins = parseInt(val);
        if (mins && mins > 0) {
          setSessions(prev => prev.map(s => {
            if (s.id === id) {
              const newEndTime = Math.max(s.endTime, Date.now()) + mins * 60 * 1000;
              return { ...s, endTime: newEndTime, status: 'ACTIVE' };
            }
            return s;
          }));
        }
      }
    });
  };

  const handleFinish = (id) => {
    setModalConfig({
      type: 'confirm',
      title: 'End Session Early',
      message: 'Are you sure you want to end this RC session right now?',
      confirmText: 'End Session',
      onConfirm: () => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'FINISHED' } : s));
      }
    });
  };

  const handleDelete = (id) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete Record permanently',
      message: 'Warning: This will permanently delete the rental record.',
      confirmText: 'Delete',
      danger: true,
      onConfirm: () => {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    });
  };

  const calculateRemaining = (endTime) => {
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) return '00:00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = (session) => {
    if (session.status !== 'ACTIVE') return false;
    const diff = session.endTime - Date.now();
    return diff > 0 && diff <= 120000;
  };

  const initAudio = () => {
    if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  return (
    <div className="container" onClick={initAudio}>
      
      {modalConfig && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
               {modalConfig.danger && <AlertTriangle color="var(--red)"/>}
               {modalConfig.title}
            </h3>
            <p>{modalConfig.message}</p>
            
            {modalConfig.type === 'prompt' && (
              <input 
                autoFocus
                className="input-field" 
                type="number"
                defaultValue={modalConfig.defaultValue} 
                id="prompt-input" 
                style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    modalConfig.onConfirm(e.target.value);
                    setModalConfig(null);
                  }
                }}
              />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button 
                style={{background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.75rem 1.25rem'}} 
                onClick={() => {
                  if (modalConfig.onCancel) modalConfig.onCancel();
                  setModalConfig(null);
                }}>
                Cancel
              </button>
              <button 
                className={modalConfig.danger ? "btn-danger" : "btn-primary"} 
                style={{padding: '0.75rem 1.25rem'}}
                onClick={() => {
                  let val = true;
                  if (modalConfig.type === 'prompt') {
                    val = document.getElementById('prompt-input') ? document.getElementById('prompt-input').value : null;
                  }
                  modalConfig.onConfirm(val);
                  setModalConfig(null);
                }}>
                {modalConfig.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem' }}>
          Active Sessions: {sessions.filter(s => s.status === 'ACTIVE').length}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Create New Session</h2>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <input className="input-field" placeholder="Cust ID (e.g. RC-001)" value={customerId} onChange={e=>setCustomerId(e.target.value)} />
            <input className="input-field" placeholder="RC Unit (e.g. Car #1)" value={rcId} onChange={e=>setRcId(e.target.value)} />
            <select className="input-field" value={durationMinutes} onChange={e=>setDurationMinutes(parseInt(e.target.value))}>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={180}>3 Hours</option>
              <option value={300}>5 Hours</option>
            </select>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
              <Play size={18} /> Start Session
            </button>
          </div>
          {formError && <div style={{color: 'var(--yellow)', fontSize: '0.9rem', marginTop: '0.5rem'}}>{formError}</div>}
        </form>
      </div>

      <h2>Active Tracker (Offline Mode)</h2>
      <div className="grid-cards">
        {sessions.map(session => {
          const warning = isWarning(session);
          return (
            <div key={session.id} className="card" style={{ 
              position: 'relative', 
              border: session.status === 'EXPIRED' ? '2px solid var(--red)' : warning ? '2px solid var(--yellow)' : '2px solid transparent',
              boxShadow: session.status === 'EXPIRED' ? '0 0 15px rgba(239, 68, 68, 0.2)' : warning ? '0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{session.customerId}</h3>
                  <span style={{ color: 'var(--text-muted)' }}>{session.rcId}</span>
                </div>
                <span className={`badge badge-${session.status.toLowerCase()}`}>
                  {session.status}
                </span>
              </div>

              <div style={{ 
                margin: '1.5rem 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '3rem', 
                fontWeight: 'bold',
                color: session.status === 'EXPIRED' ? 'var(--red)' : warning ? 'var(--yellow)' : 'var(--text-main)',
                fontVariantNumeric: 'tabular-nums'
              }}>
                <Clock size={32} />
                {session.status === 'ACTIVE' ? calculateRemaining(session.endTime) : '00:00'}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-warning" onClick={() => handleExtend(session.id)} title="Extend Time">
                  <RotateCcw size={16} />
                </button>
                {session.status !== 'FINISHED' && (
                  <button className="btn-warning" onClick={() => handleFinish(session.id)} title="Finish Now">
                    <StopCircle size={16} />
                  </button>
                )}
                <button className="btn-danger" onClick={() => handleDelete(session.id)} title="Delete Record">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {sessions.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No sessions found.</p>}
      </div>
    </div>
  );
}
