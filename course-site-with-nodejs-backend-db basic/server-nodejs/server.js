const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Get all courses
app.get('/api/courses', async (req, res) => {
  const courses = await prisma.course.findMany();
  res.json(courses);
});

// Add a new course
app.post('/api/courses', async (req, res) => {
  const { title, description } = req.body;
  const newCourse = await prisma.course.create({
    data: { title, description }
  });
  res.json(newCourse);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
