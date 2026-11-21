import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import { config } from './config.js';
import { connectDb } from './db.js';
import { RuleCompiler } from './compiler.js';
import { createRoutes } from './routes.js';

await connectDb();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});
const compiler = new RuleCompiler(io);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'NexusFlow' });
});

app.use('/api', createRoutes(compiler, io));

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
});

server.listen(config.port, () => {
  console.log(NexusFlow backend running on port ${config.port});
});
