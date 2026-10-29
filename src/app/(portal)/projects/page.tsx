'use client';

import { ProjectList } from '@/components/projects/ProjectList';
import { useUser } from '@/components/UserProvider';
import { PageHeader } from '@/components/ui';

export default function ProjectsPage() {
  const { user } = useUser();
  return (
    <>
      <PageHeader eyebrow="Delivery" title="Projects" subtitle="Where each client project is, and which milestone it’s on." />
      <ProjectList rate={user?.commissionRate} />
    </>
  );
}
