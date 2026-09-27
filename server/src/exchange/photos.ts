import { createHash } from 'node:crypto';
import { ImageStoreError, isKeptImageUrl, uploadJpeg } from './images.js';

export const PHOTO_POSITIONS = ['FRONT', 'SIDE', 'IN_PLACE'] as const;

export class PhotoError extends Error {
  status = 400;
}

export async function storeListingPhotos(listingId: string, photos: { position?: string; dataUrl?: string }[]) {
  if (!Array.isArray(photos) || photos.length !== PHOTO_POSITIONS.length) {
    throw new PhotoError('Three live photos are required: front, side, and where it sits.');
  }

  const hashes = new Set<string>();
  const saved: { position: string; url: string }[] = [];

  for (const position of PHOTO_POSITIONS) {
    const photo = photos.find((item) => item.position === position);
    const dataUrl = photo?.dataUrl ?? '';
    if (isKeptImageUrl(dataUrl)) {
      saved.push({ position, url: dataUrl });
      continue;
    }
    const match = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new PhotoError(`Take the ${position.toLowerCase().replace('_', ' ')} photo with the camera.`);
    const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
    if (buffer.length < 8_000 || buffer.length > 2_000_000) {
      throw new PhotoError('Each photo has to be a camera shot of the item, not a tiny icon or a huge file.');
    }
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hashes.has(hash)) throw new PhotoError('Those photos are the same shot. Move and photograph the item from the other position.');
    hashes.add(hash);
    try {
      const url = await uploadJpeg(buffer, 'listings', `${listingId}-${position.toLowerCase()}`);
      saved.push({ position, url });
    } catch (error) {
      if (error instanceof ImageStoreError) throw new PhotoError(error.message);
      throw new PhotoError('The photo did not save. Try that shot again.');
    }
  }

  return saved;
}
