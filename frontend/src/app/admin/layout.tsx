import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Админ — Tent',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
