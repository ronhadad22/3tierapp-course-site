import React, { useState, useEffect } from "react";

export default function CourseApp() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New state for form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch courses from backend
  const fetchCourses = () => {
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
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Handle form submit
  const handleAddCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5001/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) throw new Error("Failed to add course");
      setTitle("");
      setDescription("");
      fetchCourses();
    } catch (err) {
      setError("Failed to add course");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
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

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h1>📚 My Dev Courses</h1>

      {/* Add Course Form */}
      <form onSubmit={handleAddCourse} style={{ marginBottom: "30px", background: "#f9f9f9", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h2 style={{ marginTop: 0 }}>Add a New Course</h2>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{ padding: "8px", width: "100%", marginBottom: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            rows={3}
            style={{ padding: "8px", width: "100%", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !title || !description}
          style={{ padding: "8px 16px", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Adding..." : "Add Course"}
        </button>
        {error && <p style={{ color: "red", marginTop: "8px" }}>{error}</p>}
      </form>

      {loading ? (
        <p>Loading courses...</p>
      ) : selectedCourse ? (
        <div>
          <button
            onClick={() => setSelectedCourse(null)}
            style={{
              marginBottom: "20px",
              padding: "8px 12px",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            ⬅ Back
          </button>
          <div style={{ border: "1px solid #ddd", padding: "16px", borderRadius: "8px" }}>
            <h2>{selectedCourse.title}</h2>
            <p>{selectedCourse.description}</p>
          </div>
        </div>
      ) : (
        <div>
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                margin: "10px 0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "box-shadow 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)")}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <h3>{course.title}</h3>
              <p>{course.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
