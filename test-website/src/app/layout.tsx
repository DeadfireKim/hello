import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Screenshot API - Website Screenshot Service',
  description: 'RESTful API for capturing website screenshots with webhook callbacks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
