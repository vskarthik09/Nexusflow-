import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  dbName: process.env.DB_NAME || 'nexusflow',
  jwtSecret: process.env.JWT_SECRET || 'local-development-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
