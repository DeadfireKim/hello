import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3Config } from '@/lib/config/s3';
import fs from 'fs';
import path from 'path';

export async function uploadToStorage(
  jobId: string,
  buffer: Buffer,
  format: string = 'png'
): Promise<string> {
  const key = `screenshots/${jobId}.${format}`;

  // Development fallback: save to local filesystem if S3 fails
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasValidS3Config = s3Config.bucket &&
                          s3Config.bucket !== 'screenshot-bucket' &&
                          s3Config.accessKeyId !== 'dev_access_key';

  if (isDevelopment && !hasValidS3Config) {
    console.log('⚠️  S3 not configured, saving to local filesystem...');

    // Save to public/screenshots directory
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');

    // Create directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `${jobId}.${format}`;
    const filepath = path.join(screenshotsDir, filename);

    fs.writeFileSync(filepath, buffer);

    console.log(`✅ Screenshot saved locally: ${filename}`);

    // Return public URL
    return `/screenshots/${filename}`;
  }

  try {
    // Upload to S3/R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: buffer,
        ContentType: `image/${format}`,
      })
    );

    // Generate signed URL (24h expiry)
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      }),
      { expiresIn: s3Config.signedUrlExpiry }
    );

    return signedUrl;
  } catch (error) {
    console.error('Upload to storage failed:', error);
    throw new Error('Failed to upload image to storage');
  }
}

export async function deleteFromStorage(jobId: string, format: string = 'png'): Promise<void> {
  // Optional: implement cleanup
  // const key = `screenshots/${jobId}.${format}`;
  // await s3Client.send(new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: key }));
}
