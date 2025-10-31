const express = require('express');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Parse JSON
app.use(express.json());

// ✅ 1. CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhelpfrontend.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow requests without origin (e.g., server-to-server)
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Handle preflight requests properly
app.options(/.*/, cors());


// ✅ 2. Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend live and healthy 🚀' });
});

// ✅ 3. Test routes
app.post('/test', async (req, res) => {
  try {
    const { name } = req.body;
    const test = await prisma.test.create({ data: { name } });
    res.status(201).json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getall', async (req, res) => {
  try {
    const tests = await prisma.test.findMany();
    res.status(200).json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ 4. Auth routes
app.use('/api/auth', authRoutes);

// ✅ 5. Server start — required for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
