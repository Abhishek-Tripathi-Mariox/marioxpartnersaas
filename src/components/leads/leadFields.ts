import type { FieldDef } from '@/components/forms/DynamicForm';
import type { PipelineConfig } from '@/lib/pipeline';

// Lead form fields; source and priority options come from the admin's pipeline settings.
export function leadFields(cfg: PipelineConfig): FieldDef[] {
  return [
    { name: 'company', label: 'Company', required: true },
    { name: 'project', label: 'Project', placeholder: 'e.g. Dealer portal' },
    { name: 'value', label: 'Deal value (₹)', type: 'number' },
    { name: 'contact', label: 'Contact person', placeholder: 'Rahul Bose, CTO', hint: 'Name, then a comma and their designation' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'city', label: 'City' },
    { name: 'expectedClose', label: 'Expected close', type: 'date' },
    { name: 'source', label: 'Source', type: 'chips', options: cfg.sources },
    { name: 'priority', label: 'Priority', type: 'chips', options: cfg.priorities.map(p => p.name) },
  ];
}
