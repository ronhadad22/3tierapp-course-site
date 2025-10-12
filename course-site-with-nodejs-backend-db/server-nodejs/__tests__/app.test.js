const request = require('supertest');

// Mock prisma client used by the app so we don't hit a real DB
jest.mock('../prismaClient', () => {
  return {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
});

// Mock auth middleware to be no-ops so protected routes are reachable in tests
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => next(),
  requireRole: () => (req, _res, next) => next(),
}));

const prisma = require('../prismaClient');
const app = require('../app');

describe('Course Site API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/courses returns list of courses', async () => {
    const rows = [
      { id: 1, title: 'DB 101', description: 'intro' },
      { id: 2, title: 'DB 201', description: 'advanced' },
    ];
    prisma.course.findMany.mockResolvedValue(rows);

    const res = await request(app).get('/api/courses').expect(200);
    expect(res.body).toEqual(rows);
    expect(prisma.course.findMany).toHaveBeenCalledTimes(1);
  });

  test('GET /api/courses/:id validates id', async () => {
    const res = await request(app).get('/api/courses/abc').expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/courses/:id not found -> 404', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/courses/999').expect(404);
    expect(res.body).toHaveProperty('error');
    expect(prisma.course.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      include: { lessons: true },
    });
  });

  test('GET /api/courses/:id returns course with lessons', async () => {
    const row = { id: 3, title: 'DB 301', description: 'pro', lessons: [] };
    prisma.course.findUnique.mockResolvedValue(row);
    const res = await request(app).get('/api/courses/3').expect(200);
    expect(res.body).toEqual(row);
  });

  test('GET /api/courses/:id/lessons returns lessons ordered', async () => {
    const lessons = [
      { id: 1, title: 'L1', content: '...' },
      { id: 2, title: 'L2', content: '...' },
    ];
    prisma.lesson.findMany.mockResolvedValue(lessons);

    const res = await request(app).get('/api/courses/5/lessons').expect(200);
    expect(res.body).toEqual(lessons);
    expect(prisma.lesson.findMany).toHaveBeenCalledWith({
      where: { courseId: 5 },
      orderBy: { createdAt: 'asc' },
    });
  });

  test('POST /api/courses requires title and description', async () => {
    const res = await request(app)
      .post('/api/courses')
      .send({ title: 'T' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/courses creates a course', async () => {
    const created = { id: 10, title: 'T', description: 'D' };
    prisma.course.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/courses')
      .send({ title: 'T', description: 'D' })
      .expect(200);

    expect(res.body).toEqual(created);
    expect(prisma.course.create).toHaveBeenCalledWith({
      data: { title: 'T', description: 'D' },
    });
  });

  test('POST /api/courses/:id/lessons validates input', async () => {
    const res = await request(app)
      .post('/api/courses/1/lessons')
      .send({ title: 'L1' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/courses/:id/lessons creates lesson when course exists', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 1 });
    const created = { id: 22, title: 'L1', content: 'C', courseId: 1 };
    prisma.lesson.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/courses/1/lessons')
      .send({ title: 'L1', content: 'C' })
      .expect(200);

    expect(res.body).toEqual(created);
  });

  test('DELETE /api/courses/:id deletes lessons first then course', async () => {
    prisma.lesson.deleteMany.mockResolvedValue({ count: 2 });
    prisma.course.delete.mockResolvedValue({ id: 1 });

    const res = await request(app).delete('/api/courses/1').expect(200);
    expect(res.body.success).toBe(true);
    expect(prisma.lesson.deleteMany).toHaveBeenCalledWith({ where: { courseId: 1 } });
    expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
