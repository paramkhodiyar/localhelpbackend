const express = require('express');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/authRoutes.js');
const cors = require('cors');

dotenv.config();
const app = express();
const prisma = new PrismaClient();

// ✅ Define allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://localhelpfrontend.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed =
      allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin);
    return isAllowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// ✅ CORS must come FIRST
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Health check routes
app.get('/health', (req, res) => res.status(200).json({ message: 'Health check ok' }));
app.get('/', (req, res) => res.status(200).json({ message: 'Health check ok' }));

// ✅ Sample test route
app.post('/test', async (req, res) => {
  const { name } = req.body;
  const test = await prisma.test.create({ data: { name } });
  res.status(201).json(test);
});

app.get('/getall', async (req, res) => {
  const tests = await prisma.test.findMany();
  res.status(200).json(tests);
});

// ✅ Auth routes
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
