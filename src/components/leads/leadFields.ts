import type { FieldDef } from '@/components/forms/DynamicForm';
import type { PipelineConfig } from '@/lib/pipeline';

// Lead form fields; source and priority options come from the admin's pipeline settings.
export function leadFields(cfg: PipelineConfig): FieldDef[] {
  return [
    // Same fields and wording as the original "New lead" form.
    { name: 'company', label: 'Company *', placeholder: 'e.g. Apex Motors', required: true, full: true },
    { name: 'project', label: 'Requirement', placeholder: 'e.g. Dealer portal' },
    { name: 'contact', label: 'Contact person', placeholder: 'Name, designation' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+91' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
    { name: 'value', label: 'Estimated value (₹)', type: 'number', placeholder: '800000' },
    { name: 'expectedClose', label: 'Expected close', type: 'date' },
    { name: 'source', label: 'Source', type: 'select', options: cfg.sources },
    { name: 'priority', label: 'Priority', type: 'select', options: cfg.priorities.map(p => p.name) },
    { name: 'city', label: 'City', placeholder: 'e.g. Noida' },
  ];
}
