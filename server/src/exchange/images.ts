import { v2 as cloudinary } from 'cloudinary';

export class ImageStoreError extends Error {}

export function isKeptImageUrl(url: string) {
  return url.startsWith('/api/uploads/') || url.startsWith('https://res.cloudinary.com/');
}

function cloudinaryAccount() {
  const url = process.env.CLOUDINARY_URL ?? '';
  const parsed = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/\s]+)$/);
  if (parsed) return { apiKey: parsed[1], apiSecret: parsed[2], cloudName: parsed[3] };
  return {
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  };
}

/** Uploads a JPEG and returns the Cloudinary URL stored on the record. */
export function uploadJpeg(buffer: Buffer, folder: string, publicId: string) {
  const { cloudName, apiKey, apiSecret } = cloudinaryAccount();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ImageStoreError('Add the Cloudinary credentials in server/.env before uploading images.');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `spare/${folder}`, public_id: publicId, overwrite: true, resource_type: 'image', format: 'jpg' },
      (error, result) => {
        if (error || !result?.secure_url) reject(error ?? new ImageStoreError('The image did not save.'));
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
