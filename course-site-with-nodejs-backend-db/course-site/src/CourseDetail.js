import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5001/api/courses/${id}`);
        if (!res.ok) throw new Error("Could not fetch course");
        const data = await res.json();
        setCourse(data);
        setLessons(data.lessons || []);
      } catch (err) {
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id]);

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:5001/api/courses/${id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: lessonTitle, content: lessonContent })
      });
      if (!res.ok) throw new Error("Failed to add lesson");
      const newLesson = await res.json();
      setLessons((prev) => [...prev, newLesson]);
      setLessonTitle("");
      setLessonContent("");
    } catch (err) {
      setError("Failed to add lesson");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!course) return <div style={{ padding: 32 }}>Course not found.</div>;

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", background: "#f4f7fa", minHeight: "100vh", padding: "32px 0" }}>
      <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: "700px", margin: "auto", padding: "32px 36px 28px 36px" }}>
        <button onClick={() => navigate("/")} style={{ marginBottom: 18, background: "none", border: "none", color: "#3182ce", cursor: "pointer", fontSize: "1rem", textDecoration: "underline" }}>
          ← Back to Courses
        </button>
        <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>{course.title}</h1>
        <p style={{ color: "#555", marginBottom: "20px" }}>{course.description}</p>
        <h2 style={{ fontSize: "1.2rem", margin: "24px 0 10px 0" }}>Lessons / Modules</h2>
        {lessons.length === 0 ? (
          <div style={{ color: "#888", marginBottom: 18 }}>No lessons yet.</div>
        ) : (
          <ul style={{ padding: 0, listStyle: "none", marginBottom: 18 }}>
            {lessons.map((lesson) => (
              <li key={lesson.id} style={{ background: "#f7fafc", borderRadius: 8, padding: "14px 18px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: 600, fontSize: "1.07rem" }}>{lesson.title}</div>
                <div style={{ color: "#444", marginTop: 4 }}>{lesson.content}</div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddLesson} style={{ background: "#f7fafc", padding: "18px 20px 14px 20px", borderRadius: "10px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom: "10px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Lesson Title"
              value={lessonTitle}
              onChange={e => setLessonTitle(e.target.value)}
              required
              style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "1rem", marginBottom: 0 }}
            />
            <textarea
              placeholder="Lesson Content"
              value={lessonContent}
              onChange={e => setLessonContent(e.target.value)}
              required
              rows={2}
              style={{ flex: 2, minWidth: 0, padding: "8px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "1rem", resize: "vertical" }}
            />
          </div>
          <button
            type="submit"
            disabled={adding || !lessonTitle || !lessonContent}
            style={{ padding: "9px 22px", background: adding ? "#a0aec0" : "#3182ce", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 500, fontSize: "1.05rem", cursor: adding ? "not-allowed" : "pointer", boxShadow: adding ? "none" : "0 2px 8px rgba(49,130,206,0.08)" }}
          >
            {adding ? "Adding..." : "+ Add Lesson"}
          </button>
          {error && <p style={{ color: "#e53e3e", marginTop: "10px", fontWeight: 500 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
