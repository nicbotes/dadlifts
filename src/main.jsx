import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import api, { getStoredKey, setStoredKey, clearStoredKey } from './api.js';

// ── AUTH GATE ─────────────────────────────────────────────────────────────────
function AuthGate() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [input,    setInput]    = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // On mount: check if a stored key already works
  useEffect(() => {
    if (!getStoredKey()) { setChecking(false); return; }
    api.checkAuth()
      .then(() => setAuthed(true))
      .catch(() => { clearStoredKey(); })
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const key = input.trim();
    if (!key) return;
    setBusy(true);
    setError('');
    setStoredKey(key);
    try {
      await api.checkAuth();
      setAuthed(true);
    } catch {
      clearStoredKey();
      setError('Key not accepted. Check with OpenClaw for the current key.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return (
    <div style={styles.screen}>
      <div style={styles.dot} />
    </div>
  );

  if (authed) return <App />;

  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        <div style={styles.title}>DAD<span style={styles.accent}>LIFT</span></div>
        <div style={styles.sub}>Enter your access key to continue</div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste key here"
            autoComplete="current-password"
            autoFocus
            style={styles.input}
          />
          <button type="submit" disabled={busy || !input.trim()} style={styles.btn}>
            {busy ? '…' : 'UNLOCK'}
          </button>
        </form>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.hint}>
          Ask OpenClaw: "set up dadlift and send me the key"
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: {
    minHeight: '100vh',
    background: '#0d0d0d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Mono', monospace",
    padding: '24px',
  },
  dot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#3a3a3a',
    animation: 'pulse 1s ease infinite',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 52,
    letterSpacing: 3,
    color: '#f0f0f0',
    marginBottom: 6,
    lineHeight: 1,
  },
  accent: { color: '#E85D04' },
  sub: {
    fontSize: 12,
    color: '#787878',
    letterSpacing: 1,
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    background: '#1a1a1a',
    border: '1px solid #2e2e2e',
    color: '#f0f0f0',
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    padding: '14px 12px',
    outline: 'none',
    letterSpacing: 1,
    borderRadius: 2,
    WebkitAppearance: 'none',
  },
  btn: {
    background: '#E85D04',
    border: 'none',
    color: '#000',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 2,
    padding: '14px',
    cursor: 'pointer',
    borderRadius: 2,
    opacity: 1,
  },
  error: {
    marginTop: 12,
    fontSize: 11,
    color: '#e05555',
    letterSpacing: 0.5,
    lineHeight: 1.5,
  },
  hint: {
    marginTop: 32,
    fontSize: 10,
    color: '#3a3a3a',
    letterSpacing: 1,
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
};

// Inject font + pulse keyframe
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');
  @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; }
  input::placeholder { color: #3a3a3a; }
  button:disabled { opacity: 0.4; cursor: default; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
