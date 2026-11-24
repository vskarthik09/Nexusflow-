import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

import { getDb } from './db.js';
import { makeToken, requireAuth } from './auth.js';

export function createRoutes(compiler, io) {
  const router = Router();

  // =========================
  // SIGNUP
  // =========================
  router.post('/auth/signup', async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');

      if (!name || !email || password.length < 8) {
        return res.status(400).json({
          message: 'Enter name, email and password (8+ characters).'
        });
      }

      const users = getDb().collection('users');

      if (await users.findOne({ email })) {
        return res.status(409).json({
          message: 'Email already registered.'
        });
      }

      const user = {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        settings: { theme: 'dark', notifications: true },
        createdAt: new Date()
      };

      const result = await users.insertOne(user);
      user._id = result.insertedId;

      res.status(201).json({
        token: makeToken(user),
        user: {
          name,
          email,
          settings: user.settings
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Signup failed.' });
    }
  });

  // =========================
  // LOGIN
  // =========================
  router.post('/auth/login', async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');

      const user = await getDb()
        .collection('users')
        .findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({
          message: 'Incorrect email or password.'
        });
      }

      res.json({
        token: makeToken(user),
        user: {
          name: user.name,
          email: user.email,
          settings: user.settings || {
            theme: 'dark',
            notifications: true
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed.' });
    }
  });

  // =========================
  // AUTHENTICATION
  // =========================
  router.use(requireAuth);

  // ACCOUNT
  router.get('/me', async (req, res) => {
    const user = await getDb().collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      name: user.name,
      email: user.email,
      settings: user.settings
    });
  });

  // SETTINGS
  router.patch('/settings', async (req, res) => {
    const settings = {
      theme: req.body.theme === 'light' ? 'light' : 'dark',
      notifications: req.body.notifications !== false
    };

    await getDb().collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { settings } }
    );

    res.json({ settings });
  });

  // =========================
  // RULE DEPLOYMENT
  // =========================
  router.get('/rules', async (req, res) => {
    const rules = await getDb().collection('rules')
      .find({ owner: req.user.id })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(rules);
  });

  router.post('/rules', async (req, res) => {
    try {
      const { graph } = req.body;

      if (!graph || !Array.isArray(graph.nodes) ||
          !Array.isArray(graph.edges)) {
        return res.status(400).json({
          message: 'Invalid graph structure.'
        });
      }

      const id = String(req.body.id || `rule-${Date.now()}`);

      compiler.validate(graph);

      const record = {
        id,
        owner: req.user.id,
        name: req.body.name || 'Factory Temperature Rule',
        graph,
        status: 'active',
        updatedAt: new Date()
      };

      await getDb().collection('rules').updateOne(
        { id, owner: req.user.id },
        { $set: record },
        { upsert: true }
      );

      compiler.deploy(id, graph);

      io.emit('rule-status', { id, status: 'active' });

      res.json({
        success: true,
        message: 'Rule deployed successfully.',
        id,
        status: 'active'
      });
    } catch (error) {
      console.error('Rule deployment error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  router.delete('/rules/:id', async (req, res) => {
    await getDb().collection('rules').deleteOne({
      id: req.params.id,
      owner: req.user.id
    });

    compiler.remove(req.params.id);
    res.json({ success: true });
  });

  // =========================
  // TELEMETRY INGESTION
  // =========================
  router.post('/telemetry', async (req, res) => {
    try {
      const value = Number(req.body.value);

      if (!Number.isFinite(value)) {
        return res.status(400).json({
          message: 'Telemetry value must be numeric.'
        });
      }

      const point = {
        meta: {
          deviceId: String(req.body.deviceId || 'TURBINE-01'),
          metric: String(req.body.metric || 'temperature')
        },
        value,
        timestamp: req.body.timestamp
          ? new Date(req.body.timestamp)
          : new Date()
      };

      if (Number.isNaN(point.timestamp.getTime())) {
        return res.status(400).json({
          message: 'Invalid timestamp.'
        });
      }

      await getDb().collection('telemetry').insertOne(point);

      compiler.push(point);
      io.emit('telemetry', point);

      res.status(202).json({
        success: true,
        message: 'Telemetry received.',
        point
      });
    } catch (error) {
      console.error('Telemetry error:', error);
      res.status(500).json({ message: 'Telemetry ingestion failed.' });
    }
  });

  router.get('/telemetry', async (req, res) => {
    const points = await getDb().collection('telemetry')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    res.json(points.reverse());
  });

  // =========================
  // ALERT HISTORY
  // =========================
  router.get('/alerts', async (req, res) => {
    const alerts = await getDb().collection('alerts')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(alerts);
  });

  return router;
}
