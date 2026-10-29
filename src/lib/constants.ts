// Shared by server and client. Values carried over from the original portal.
// Lead stages, sources, priorities and lost reasons are admin-configurable: see lib/pipeline.ts.
export const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note', 'stage', 'task', 'won'];

export const PROJECT_STAGES = ['Discovery', 'UI/UX design', 'Development', 'QA & UAT', 'Go-live'];
export const PAYMENT_STATUS = ['upcoming', 'due', 'received'];

export const OFFICES = ['Noida', 'Bangalore', 'Mumbai'];
export const SLOTS = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];
export const VISIT_PURPOSES = ['Client pitch', 'Solution demo', 'Contract signing', 'Project review'];
export const TEAMS = ['No Mariox team needed', 'Business Analyst (BA)', 'Project Manager', 'Tech Lead', 'Solution Architect', 'UI/UX Designer', 'Sales Head'];
export const TECH_TYPES = ['Pre-sales call', 'Live demo', 'Technical scoping', 'Proposal review', 'Join office meeting'];
export const MEET_MODES = ['Google Meet', 'Zoom', 'Phone', 'In person'];
export const DURATIONS = ['30 min', '45 min', '60 min', '90 min'];
export const TICKET_CATS = ['Commission & payout', 'Project delivery', 'Scope & pricing', 'Sales resources', 'Other'];
export const RESOURCE_TYPES = ['Case study', 'Portfolio', 'Deck', 'Brochure'];

// Status values for partner requests and what admin can move them to.
export const REQUEST_STATUS = {
  scope: ['review', 'approved', 'revised', 'rejected'],
  booking: ['Requested', 'Confirmed', 'Rescheduled', 'Declined', 'Completed'],
  tech: ['requested', 'assigned', 'completed', 'declined'],
  ticket: ['requested', 'assigned', 'completed'],
} as const;

export const TDS_RATE = 0.02;
// Same as RATE in the original portal; can be changed per partner from admin.
export const DEFAULT_COMMISSION_RATE = 0.5;
