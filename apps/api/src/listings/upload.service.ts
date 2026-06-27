import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { UploadRequestInput, UploadTicket } from '@rescuebite/types';
import { AppConfigService } from '../config/app-config.service';

const EXPIRES_IN = 900;
const EXTENSIONS: Record<UploadRequestInput['contentType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Issues signed PUT URLs for listing images on S3-compatible storage. The client
 * uploads the bytes directly, then persists the returned `fileUrl` on the listing.
 * When S3 isn't configured (local dev), returns a stub ticket so the flow still works.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly client: S3Client | null;

  constructor(private readonly config: AppConfigService) {
    const s3 = this.config.s3;
    this.client =
      s3.bucket && s3.accessKeyId && s3.secretAccessKey
        ? new S3Client({
            region: s3.region,
            ...(s3.endpoint ? { endpoint: s3.endpoint, forcePathStyle: true } : {}),
            credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
          })
        : null;
  }

  async createListingImageTicket(input: UploadRequestInput): Promise<UploadTicket> {
    const key = `listings/${randomUUID()}.${EXTENSIONS[input.contentType]}`;
    const s3 = this.config.s3;

    if (!this.client || !s3.bucket) {
      // Dev fallback: no real storage, but the upload contract is still exercisable.
      this.logger.warn('S3 not configured — issuing a stub upload ticket.');
      return {
        uploadUrl: `${this.config.appWebUrl}/__dev-upload/${key}`,
        fileUrl: `${this.config.appWebUrl}/__dev-uploads/${key}`,
        method: 'PUT',
        expiresIn: EXPIRES_IN,
      };
    }

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: s3.bucket, Key: key, ContentType: input.contentType }),
      { expiresIn: EXPIRES_IN },
    );
    const base = s3.publicUrl ?? `${s3.endpoint ?? `https://${s3.bucket}.s3.${s3.region}.amazonaws.com`}`;
    return {
      uploadUrl,
      fileUrl: `${base.replace(/\/$/, '')}/${key}`,
      method: 'PUT',
      expiresIn: EXPIRES_IN,
    };
  }
}
