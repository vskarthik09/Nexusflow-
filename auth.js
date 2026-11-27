import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required. Please sign in.'
    });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Session expired. Please sign in again.'
    });
  }
}

export function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}
