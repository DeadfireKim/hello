import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to API health check endpoint
  redirect('/api/health');
}
