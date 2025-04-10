import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Configure AWS S3
export const s3 = new AWS.S3({
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET_KEY || '',
  s3Bucket: process.env.AWS_S3_BUCKET_NAME || '',
  s3Region: process.env.AWS_S3_REGION || '',
};

// Update the SessionData interface to include abandonment tracking
export interface SessionData {
  userId: string;
  route: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  startTime: Date;
  endTime: Date | null;
  totalDistance: number;
  steps: number;
  abandoned?: boolean;
  lastActivity: Date;
}

export const sessions: Record<string, SessionData> = {}; 