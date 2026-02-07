import sharp from 'sharp';

export interface OptimizeOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; format: string }> {
  const format = options.format || 'png';
  const quality = options.quality || 80;

  let pipeline = sharp(buffer);

  // Convert to specified format
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'png':
    default:
      pipeline = pipeline.png({ compressionLevel: 9, progressive: true });
      break;
  }

  const optimizedBuffer = await pipeline.toBuffer();

  return {
    buffer: optimizedBuffer,
    format,
  };
}

export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: buffer.length,
    format: metadata.format || 'unknown',
  };
}
