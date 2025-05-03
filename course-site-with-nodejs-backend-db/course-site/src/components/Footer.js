import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#2d3748',
      color: 'white',
      padding: '1rem 0',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.875rem'
      }}>
        <div style={{ color: '#cbd5e0' }}>
          © {new Date().getFullYear()} Course Platform
        </div>
        <div style={{ display: 'flex', gap: '2rem', color: '#cbd5e0' }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</a>
          <a href="/courses" style={{ color: 'inherit', textDecoration: 'none' }}>Courses</a>
          <span>support@courseplatform.com</span>
        </div>
      </div>
    </footer>
  );
}
