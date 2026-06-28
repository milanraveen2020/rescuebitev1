import {
  ApiErrorResponseSchema,
  ListingSchema,
  UploadTicketSchema,
  type ApiErrorCode,
  type CreateListingInput,
  type Listing,
  type UpdateListingInput,
  type UploadRequestInput,
} from '@rescuebite/types';
import { authedFetch } from '@/lib/session';

/** Copy a listing's content into a fresh create payload (status decided by caller). */
function copyFrom(listing: Listing): Omit<CreateListingInput, 'status'> {
  return {
    title: listing.title,
    description: listing.description ?? undefined,
    category: listing.category,
    originalPrice: listing.originalPrice,
    price: listing.price,
    quantityTotal: listing.quantityTotal,
    pickupStart: listing.pickupStart,
    pickupEnd: listing.pickupEnd,
    imageUrl: listing.imageUrl ?? undefined,
  };
}

/** A sensible default evening pickup window for today, never in the past. */
function defaultTodayWindow(): { pickupStart: string; pickupEnd: string } {
  const start = new Date();
  start.setHours(17, 0, 0, 0);
  const earliest = new Date(Date.now() + 30 * 60 * 1000);
  if (start < earliest) start.setTime(earliest.getTime());
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return { pickupStart: start.toISOString(), pickupEnd: end.toISOString() };
}

export class ListingApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ListingApiError';
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(json);
    if (parsed.success) {
      const details = parsed.data.error.details as
        { fieldErrors?: Record<string, string[]> } | undefined;
      throw new ListingApiError(
        parsed.data.error.code,
        parsed.data.error.message,
        details?.fieldErrors,
      );
    }
    throw new ListingApiError('internal_error', 'Something went wrong. Please try again.');
  }
  return json;
}

export async function listMyListings(): Promise<Listing[]> {
  const json = await parseJson(await authedFetch('/merchant/listings'));
  return ListingSchema.array().parse(json);
}

export async function getMyListing(id: string): Promise<Listing> {
  const json = await parseJson(await authedFetch(`/merchant/listings/${id}`));
  return ListingSchema.parse(json);
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const json = await parseJson(
    await authedFetch('/merchant/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  return ListingSchema.parse(json);
}

export async function updateListing(id: string, input: UpdateListingInput): Promise<Listing> {
  const json = await parseJson(
    await authedFetch(`/merchant/listings/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  return ListingSchema.parse(json);
}

/** Duplicate a listing as a new DRAFT (same content, ready to tweak). */
export async function duplicateListing(listing: Listing): Promise<Listing> {
  return createListing({ ...copyFrom(listing), title: `${listing.title} (copy)`, status: 'DRAFT' });
}

/** Publish a listing's content live for today with a default pickup window. */
export async function publishForToday(listing: Listing): Promise<Listing> {
  return createListing({ ...copyFrom(listing), ...defaultTodayWindow(), status: 'ACTIVE' });
}

/**
 * Upload an image: request a signed ticket, PUT the bytes to it, return the
 * public URL to store on the listing. In dev (no S3) the ticket is a stub, so we
 * skip the PUT and just return the file URL.
 */
export async function uploadListingImage(file: File): Promise<string> {
  const contentType = file.type as UploadRequestInput['contentType'];
  const ticketJson = await parseJson(
    await authedFetch('/uploads/listing-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentType }),
    }),
  );
  const ticket = UploadTicketSchema.parse(ticketJson);

  if (!ticket.uploadUrl.includes('__dev-upload')) {
    const put = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: file,
    });
    if (!put.ok) {
      throw new ListingApiError('internal_error', 'Image upload failed. Please try again.');
    }
  }
  return ticket.fileUrl;
}
