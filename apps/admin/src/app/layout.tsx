import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RescueBite Admin',
  description: 'Operate the RescueBite marketplace: merchants, listings, and orders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
