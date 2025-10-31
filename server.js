const express = require('express');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/authRoutes.js');
const cors = require('cors');
dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const allowedOrigins = [
  "https://localhelpfrontend.vercel.app",
  "http://localhost:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server / curl
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin); // allow vercel preview domains
    return isAllowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Ensure credentials header is present when needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
// Top-level health check
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Health check ok' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Health check ok' });
});

app.post('/test', async (req, res) => {

  const { name } = req.body;
  const test = await prisma.test.create({
    data: { name },
  });
  res.status(201).json(test);
});

app.get('/getall', async (req, res) => {
  const tests = await prisma.test.findMany();
  res.status(200).json(tests);
});
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
server.on('error', (err) => {
  console.error('Server error:', err);
});