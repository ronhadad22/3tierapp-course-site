import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import config from "./config";

export default function AddCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiUrl}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) throw new Error("Failed to add course");
      setTitle("");
      setDescription("");
      navigate("/");
    } catch (err) {
      setError("Failed to add course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", background: "#f4f7fa", minHeight: "100vh", padding: "32px 0" }}>
      <div style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: "520px", margin: "auto", padding: "32px 36px 28px 36px" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "18px", display: "flex", alignItems: "center", gap: "14px" }}>
          <img src="/my-logo.jpg" alt="Logo" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", boxShadow: "0 1px 6px rgba(0,0,0,0.10)" }} />
          Add a New Course
        </h1>
        <form onSubmit={handleAddCourse} style={{ background: "#f7fafc", padding: "20px 22px 18px 22px", borderRadius: "10px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom: "14px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Course Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "1rem", marginBottom: "0" }}
            />
            <textarea
              placeholder="Short Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={2}
              style={{ flex: 2, minWidth: 0, padding: "10px 12px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "1rem", resize: "vertical" }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !title || !description}
            style={{ padding: "10px 24px", background: submitting ? "#a0aec0" : "#3182ce", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 500, fontSize: "1.05rem", cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 2px 8px rgba(49,130,206,0.08)" }}
          >
            {submitting ? "Adding..." : "Add Course"}
          </button>
          {error && <p style={{ color: "#e53e3e", marginTop: "10px", fontWeight: 500 }}>{error}</p>}
        </form>
        <button onClick={() => navigate("/")} style={{ marginTop: "24px", background: "none", border: "none", color: "#3182ce", cursor: "pointer", fontSize: "1rem", textDecoration: "underline" }}>
          ← Back to Courses
        </button>
      </div>
    </div>
  );
}
