# Course Site with Node.js Backend & Prisma DB

This is a full-stack course management app with a React frontend, Node.js/Express backend, and MySQL database managed by Prisma.

## Features
- View, add, and manage courses
- View and add lessons to courses
- Modern, responsive UI

## Getting Started
1. `cd server-nodejs`
2. Install dependencies: `npm install`
3. Set up `.env` with your MySQL connection string
4. Run migrations: `npx prisma migrate dev --name init`
5. Start backend: `npm start`
6. In another terminal: `cd ../course-site` and run `npm install` & `npm start` for the frontend

## Folder Structure
- `server-nodejs/` — Node.js backend & Prisma
- `course-site/` — React frontend

## API Endpoints
- `GET /api/courses` — List all courses
- `POST /api/courses` — Add a new course
- `GET /api/courses/:id` — Get course details (with lessons)
- `GET /api/courses/:id/lessons` — List lessons for a course
- `POST /api/courses/:id/lessons` — Add lesson to a course

---

## Development
- Uses ESLint for linting
- Uses CORS for cross-origin requests
- See `.env.example` for environment setup
