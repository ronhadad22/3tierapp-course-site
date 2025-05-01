import React, { useState } from "react";

const courses = [
  {
    id: 1,
    title: "Intro to JavaScript",
    description: "Learn the basics of JavaScript, variables, loops, and functions."
  },
  {
    id: 2,
    title: "React for RON Beginners",
    description: "Build dynamic UIs with React and learn the component lifecycle."
  },
  {
    id: 3,
    title: "Node.js + Express",
    description: "Learn how to create APIs with Node.js and Express."
  }
];

export default function CourseApp() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h1>📚 My Dev Courses</h1>
      {selectedCourse ? (
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
