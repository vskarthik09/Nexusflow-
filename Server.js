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
