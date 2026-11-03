'use client';

import { ViewButton, downloadUrl } from '@/components/forms/FileUploader';
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
          r.file || r.url ? (
            <span className="row" style={{ gap: 6 }}>
            {r.file && <ViewButton file={r.file} />}
            <a className="btn xs ink" href={r.file ? downloadUrl(r.file) : r.url} download={r.file?.name} target={r.file ? undefined : '_blank'} rel="noreferrer"><Icon name="download" size="s" />Download</a>
            </span>
          ) : (
            <span className="btn xs" style={{ opacity: 0.5 }}>Coming soon</span>
          )
        }
      />
    </>
  );
}
