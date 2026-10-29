// Shapes of API responses as the frontend sees them (ids as strings, dates as ISO strings).

export type Role = 'admin' | 'partner';

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: Role;
  status: 'invited' | 'active' | 'disabled';
  partnerCode?: string;
  company?: string;
  phone?: string;
  city?: string;
  industries?: string;
  pan?: string;
  gstin?: string;
  bankAccount?: string;
  ifsc?: string;
  commissionRate: number;
  source?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type OwnerRef = Pick<User, '_id' | 'name' | 'company' | 'partnerCode'> & { commissionRate?: number };

export interface Task { _id: string; text: string; due?: string; done: boolean }
export interface Activity { _id: string; type: string; text: string; date: string }

export interface Lead {
  _id: string;
  owner: string | OwnerRef;
  company: string;
  project?: string;
  value: number;
  contact?: string;
  phone?: string;
  email?: string;
  city?: string;
  source?: string;
  priority?: string;
  stage: string;            // pipeline stage key, or 'won' / 'lost'
  lostReason?: string;
  expectedClose?: string;
  tasks: Task[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id?: string;
  label: string;
  amount: number;
  due?: string;
  status: 'upcoming' | 'due' | 'received';
  releasedAt?: string;
  utr?: string;
}

export interface Project {
  _id: string;
  owner: string | OwnerRef;
  client: string;
  contact?: string;
  city?: string;
  title: string;
  deal: number;
  closedAt?: string;
  stage: number;
  pm?: string;
  update?: string;
  milestones: string[];
  payments: Payment[];
}

export interface RequestItem {
  _id: string;
  owner: string | OwnerRef;
  status: string;
  comment?: string;
  assignee?: string;
  createdAt: string;
  // kind-specific fields
  [key: string]: unknown;
}

export interface Resource {
  _id: string;
  type: string;
  industry: string;
  title: string;
  format?: string;
  size?: string;
  url?: string;
  hidden?: boolean;
}

export interface Contact { title: string; name: string; role: string; phone: string; email: string; note: string }
export type { PortalSettings as Settings } from '@/components/SettingsProvider';
