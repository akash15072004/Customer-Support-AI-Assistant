import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support AI Assistant',
  description: 'Customer support assistant with AI classification and human handoff.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
