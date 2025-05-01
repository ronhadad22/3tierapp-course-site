import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CourseApp() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch courses from backend
  // Only show Add Course button for admin
  // (Place this in your main render)

  const fetchCourses = React.useCallback(() => {
    setLoading(true);
    fetch("http://localhost:5001/api/courses")
      .then((res) => res.json())
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch courses:", err);
        setLoading(false);
      });
  }, []);

  // Handler for deleting a course
  const handleDeleteCourse = React.useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:5001/api/courses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchCourses();
    } catch (err) {
      alert('Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  }, [fetchCourses]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", background: "#f4f7fa", minHeight: "100vh", padding: "32px 0" }}>
      <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: "700px", margin: "auto", padding: "32px 36px 28px 36px" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <img src="/my-logo.jpg" alt="Logo" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", boxShadow: "0 1px 6px rgba(0,0,0,0.10)" }} />
            <span style={{ fontWeight: 700, letterSpacing: "-1px", fontSize: "2.2rem" }}>My Dev Courses</span>
          </div>
           {user && user.role === 'admin' && (
             <button
               className="add-course-btn"
               style={{
                 padding: '10px 22px',
                 background: '#3182ce',
                 color: '#fff',
                 border: 'none',
                 borderRadius: '6px',
                 fontWeight: 600,
                 fontSize: '1.05rem',
                 cursor: 'pointer',
                 boxShadow: '0 2px 8px rgba(49,130,206,0.08)',
                 transition: 'background 0.15s',
               }}
               onClick={() => navigate('/add')}
             >
               + Add Course
             </button>
           )}
        </div>

        {loading ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <div style={{ color: "#888", margin: "32px 0 0 0", fontSize: "1.1rem" }}>No courses available.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "22px" }}>
            {courses.map((course) => (
              <div
                key={course.id}
                style={{
                  background: "#f7fafc",
                  borderRadius: "12px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  padding: "22px 26px 18px 26px",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, transform 0.12s",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "1.08rem",
                  fontWeight: 500,
                  color: "#222",
                  position: "relative",
                  outline: "none"
                }}
                onClick={() => navigate(`/course/${course.id}`)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/course/${course.id}`); }}
              >
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                  style={{ position: 'absolute', top: 12, right: 12, background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: deletingId === course.id ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(229,62,62,0.12)' }}
                  title="Delete course"
                  disabled={deletingId === course.id}
                >
                  {deletingId === course.id ? '…' : '×'}
                </button>
                <div style={{ fontSize: "1.18rem", fontWeight: 700, marginBottom: 6 }}>{course.title}</div>
                <div style={{ color: "#555", marginBottom: 3 }}>{course.description}</div>
                <div style={{ fontSize: "0.97rem", color: "#888", marginTop: 8 }}>Created: {new Date(course.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Handler for deleting a course is defined above within CourseApp
}

