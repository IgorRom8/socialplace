import { Suspense } from 'react';
import { ConnectionsPageClient } from './ConnectionsPageClient';

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <main className="vkPage">
          <p className="muted" style={{ padding: 24 }}>
            Загрузка…
          </p>
        </main>
      }
    >
      <ConnectionsPageClient />
    </Suspense>
  );
}
