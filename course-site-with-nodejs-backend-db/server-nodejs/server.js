const express = require('express');
const cors = require('cors');
const prisma = require('./prismaClient');
const authRoutes = require('./routes/auth');
const { requireAuth, requireRole } = require('./middleware/auth');

// Exported app lives in app.js so tests can import it without starting a server
const app = require('./app');
const PORT = 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
