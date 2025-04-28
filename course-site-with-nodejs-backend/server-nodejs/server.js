// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors()); // מאפשר קריאה מהדפדפן (מה-React)

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

app.get('/api/courses', (req, res) => {
  res.json(courses);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
