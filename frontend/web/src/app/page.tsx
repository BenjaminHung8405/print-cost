import { redirect } from 'next/navigation';

// Root "/" redirects to the main feature: Create Order
export default function HomePage() {
  redirect('/orders/create');
}
