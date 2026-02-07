import { S3Client } from '@aws-sdk/client-s3';

// S3 or R2 client configuration
export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

export const s3Config = {
  bucket: process.env.S3_BUCKET || 'screenshot-bucket',
  region: process.env.S3_REGION || 'auto',
  signedUrlExpiry: 86400, // 24 hours
};
