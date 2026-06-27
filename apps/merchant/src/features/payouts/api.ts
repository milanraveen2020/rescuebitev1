import {
  ApiErrorResponseSchema,
  ConnectStatusSchema,
  OnboardingLinkSchema,
  type ConnectStatus,
  type OnboardingLink,
} from '@rescuebite/types';
import { authedFetch } from '@/lib/session';

async function parseJson(response: Response): Promise<unknown> {
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(json);
    throw new Error(parsed.success ? parsed.data.error.message : 'Something went wrong.');
  }
  return json;
}

export async function getConnectStatus(): Promise<ConnectStatus> {
  return ConnectStatusSchema.parse(await parseJson(await authedFetch('/payments/connect/status')));
}

export async function startOnboarding(): Promise<OnboardingLink> {
  return OnboardingLinkSchema.parse(
    await parseJson(await authedFetch('/payments/connect/onboarding', { method: 'POST' })),
  );
}
