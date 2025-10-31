const express = require('express');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/authRoutes.js');
const cors = require('cors');
dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(
    cors({
      origin: "https://localhelpfrontend.vercel.app",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );
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