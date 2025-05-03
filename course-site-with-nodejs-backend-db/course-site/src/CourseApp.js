import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

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
    <div style={{ 
      fontFamily: "Segoe UI, Arial, sans-serif",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f4f7fa"
    }}>
      <Navbar />
      <main style={{ 
        flex: 1,
        padding: "2rem 1rem"
      }}>
        <div style={{ 
          background: "#fff", 
          borderRadius: "16px", 
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)", 
          maxWidth: "1000px", 
          margin: "0 auto", 
          padding: "32px 36px 28px 36px" 
        }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: "2rem", 
            fontWeight: 600,
            margin: 0,
            color: "#2d3748"
          }}>
            Available Courses
          </h1>
        </div>
        </div>

        {loading ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p>No courses available.</p>
        ) : (
          <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {courses.map((course) => (
              <div
                key={course.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 600 }}>{course.title}</h3>
                <p style={{ margin: '0 0 20px 0', color: '#4a5568', fontSize: '1rem', lineHeight: 1.6 }}>
                  {course.description}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: '#3182ce',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    View Course
                  </button>
                  {user && user.role === 'admin' && (
                    <button
                      style={{
                        padding: '8px 16px',
                        background: '#e53e3e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        opacity: deletingId === course.id ? 0.7 : 1
                      }}
                      onClick={() => handleDeleteCourse(course.id)}
                      disabled={deletingId === course.id}
                    >
                      {deletingId === course.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );

  // Handler for deleting a course is defined above within CourseApp
}

