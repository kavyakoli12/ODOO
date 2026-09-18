import mongoose from 'mongoose';
import { env } from './env.js';

interface DBStatus {
  isConnected: boolean;
  state: string;
  host?: string;
  name?: string;
  error?: string;
}

let lastError: string | undefined;

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    lastError = undefined;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    lastError = error.message;
    console.warn(`⚠️ MongoDB initial connection warning: ${error.message}`);
    console.warn(`ℹ️ The server will continue running. Please ensure MongoDB is running locally or provide a valid MONGODB_URI in backend/.env`);
  }
}

export function getDBStatus(): DBStatus {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  return {
    isConnected,
    state: states[stateCode] || 'unknown',
    host: mongoose.connection.host || undefined,
    name: mongoose.connection.name || undefined,
    error: lastError,
  };
}
