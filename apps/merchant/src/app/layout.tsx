import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mystery Box for Merchants',
  description: 'List surplus food as surprise bags and turn waste into revenue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
