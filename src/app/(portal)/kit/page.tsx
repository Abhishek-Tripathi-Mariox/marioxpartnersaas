'use client';

import { ResourceGrid } from '@/components/kit/ResourceGrid';
import { ToolkitNav } from '@/components/requests/ToolkitNav';
import { Icon, PageHeader } from '@/components/ui';

export default function KitPage() {
  return (
    <>
      <PageHeader eyebrow="Toolkit" title="Sales kit" subtitle="Mariox case studies, portfolio and decks to share with your clients." />
      <ToolkitNav />
      <ResourceGrid
        action={r =>
          r.url ? (
            <a className="btn xs ink" href={r.url} target="_blank" rel="noreferrer"><Icon name="download" size="s" />Download</a>
          ) : (
            <span className="btn xs" style={{ opacity: 0.5 }}>Coming soon</span>
          )
        }
      />
    </>
  );
}
