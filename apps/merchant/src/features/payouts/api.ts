import {
  ConnectStatusSchema,
  OnboardingLinkSchema,
  TransferSchema,
  type ConnectStatus,
  type OnboardingLink,
  type Transfer,
} from '@rescuebite/types';
import { apiRequest } from '@/lib/request';

export async function getConnectStatus(): Promise<ConnectStatus> {
  return ConnectStatusSchema.parse(await apiRequest('/payments/connect/status'));
}

export async function startOnboarding(): Promise<OnboardingLink> {
  return OnboardingLinkSchema.parse(
    await apiRequest('/payments/connect/onboarding', { method: 'POST' }),
  );
}

export async function listTransfers(): Promise<Transfer[]> {
  return TransferSchema.array().parse(await apiRequest('/payments/transfers'));
}
