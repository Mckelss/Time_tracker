import React from 'react';
import AdminDashboard from './AdminDashboard.jsx';

function App() {
  return (
    <div>
      <nav style={{ padding: '1rem 2rem', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏁 RC Tracker
        </h1>
      </nav>
      <AdminDashboard />
    </div>
  );
}

export default App;
