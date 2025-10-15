import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CourseApp from "./CourseApp";
import AddCourse from "./AddCourse";
import CourseDetail from "./CourseDetail";
import Login from "./Login";
import Signup from "./Signup";

function App() {
  const [user, setUser] = React.useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [showSignup, setShowSignup] = React.useState(false);

  const handleLogin = (data) => {
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
  };

  const handleSignup = (data) => {
    handleLogin(data); // auto-login after signup
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (!user) {
    if (showSignup) {
      return <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />;
  }

  return (
    <BrowserRouter>
      <div style={{ position: 'absolute', top: 16, right: 24 }}>
        <span style={{ marginRight: 8 }}>{user.name}</span>
        <button onClick={handleLogout} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 500, cursor: 'pointer' }}>Logout</button>
      </div>
      <Routes>
        <Route path="/" element={<CourseApp />} />
        <Route path="/add" element={<AddCourse />} />
        <Route path="/add-course" element={<AddCourse />} />
        <Route path="/course/:id" element={<CourseDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
