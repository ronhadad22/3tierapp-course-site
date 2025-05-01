import React, { useState, useEffect } from "react";

export default function CourseApp() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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
