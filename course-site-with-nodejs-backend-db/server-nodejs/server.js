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

// Get a course by ID (with lessons)
app.get('/api/courses/:id', async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  if (isNaN(courseId)) return res.status(400).json({ error: 'Invalid course ID' });
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: true }
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// Get all lessons for a course
app.get('/api/courses/:id/lessons', async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  if (isNaN(courseId)) return res.status(400).json({ error: 'Invalid course ID' });
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' }
  });
  res.json(lessons);
});

// Add a lesson to a course
app.post('/api/courses/:id/lessons', async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  if (isNaN(courseId) || !title || !content) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // Check course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lesson = await prisma.lesson.create({
    data: { title, content, courseId }
  });
  res.json(lesson);
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
