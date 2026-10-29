/* Creates the first admin and, unless --admin-only is passed, a demo partner with
   the sample data from the original static portal. Safe to re-run: demo data is replaced.
   Usage: npm run seed            (admin + demo)
          npm run seed -- --admin-only */
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { hashPassword } from '../src/lib/users';
import { User } from '../src/models/User';
import { Lead } from '../src/models/Lead';
import { Project } from '../src/models/Project';
import { Booking, Scope, TechRequest, Ticket } from '../src/models/Requests';
import { Resource, Setting } from '../src/models/Content';

const DEMO_EMAIL = 'rohit@sharmadigital.in';
const DEMO_PASSWORD = 'Partner@123';

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@mariox.in').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  await User.updateOne(
    { email },
    { $set: { name: 'Mariox Admin', role: 'admin', status: 'active', passwordHash: await hashPassword(password) } },
    { upsert: true },
  );
  console.log(`admin    ${email} / ${password}`);
}

async function seedDemo() {
  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    await Promise.all([Lead, Project, Scope, Booking, TechRequest, Ticket].map(m => m.deleteMany({ owner: old._id })));
    await old.deleteOne();
  }

  const p = await User.create({
    name: 'Rohit Sharma', email: DEMO_EMAIL, role: 'partner', status: 'active', partnerCode: 'MXP-0142', source: 'seed',
    company: 'Sharma Digital Consulting', phone: '+91 98110 42217', city: 'New Delhi', industries: 'Logistics, Healthcare, Retail',
    pan: 'ABCPS1234K', bankAccount: '50100228411190', ifsc: 'HDFC0001234', passwordHash: await hashPassword(DEMO_PASSWORD),
  });
  const owner = p._id;

  await Lead.insertMany([
    { company: 'Stellar Hotels', project: 'Booking engine', value: 1400000, contact: 'Rahul Bose, CTO', phone: '+91 98450 11223', email: 'rahul@stellarhotels.in', city: 'Bengaluru', source: 'LinkedIn', priority: 'Hot', stage: 'lead', expectedClose: '2027-01-30',
      tasks: [{ text: 'First discovery call', due: '2026-10-28' }], activities: [{ type: 'note', text: 'Connected on LinkedIn. Wants a direct booking engine to cut OTA commissions.', date: '2026-10-24' }] },
    { company: 'FinEdge Capital', project: 'Loan app', value: 2000000, contact: 'Pooja Desai, COO', city: 'Mumbai', source: 'Referral', priority: 'Warm', stage: 'lead', expectedClose: '2027-02-28',
      tasks: [{ text: 'Send intro email and company profile', due: '2026-11-01' }], activities: [{ type: 'note', text: 'Referred by Anil Mehta (Novatech Logistics).', date: '2026-10-26' }] },
    { company: 'GreenLeaf Organics', project: 'D2C shopping app', value: 500000, contact: 'Aman Gill, Founder', city: 'Chandigarh', source: 'Event', priority: 'Warm', stage: 'contacted', expectedClose: '2026-12-20',
      tasks: [{ text: 'Book Noida office visit', due: '2026-11-03' }], activities: [{ type: 'call', text: 'Intro call, 20 min. Wants Android and iOS app with subscriptions.', date: '2026-10-22' }] },
    { company: 'Apex Motors', project: 'Dealer portal', value: 900000, contact: 'Sunil Rana, IT Head', city: 'Noida', source: 'Existing network', priority: 'Hot', stage: 'meeting', expectedClose: '2026-12-10',
      tasks: [{ text: 'Submit scope to Mariox', due: '2026-10-25' }, { text: 'Share dealer portal case study', due: '2026-10-29' }], activities: [{ type: 'meeting', text: 'Met at Noida office with Mariox BA. 40 dealers, needs DMS integration.', date: '2026-10-21' }] },
    { company: 'Orbit Foods', project: 'Self-ordering kiosk', value: 800000, contact: 'Neha Kulkarni, Ops Head', city: 'Pune', source: 'Referral', priority: 'Warm', stage: 'proposal', expectedClose: '2026-11-30',
      tasks: [{ text: 'Follow up once scope is approved', due: '2026-10-31' }], activities: [{ type: 'email', text: 'Sent proposal draft v1, pending Mariox scope approval.', date: '2026-10-25' }] },
    { company: 'Zenith Realty', project: 'CRM and broker app', value: 1750000, contact: 'Karthik Rao, MD', city: 'Bengaluru', source: 'Existing network', priority: 'Hot', stage: 'negotiation', expectedClose: '2026-11-15',
      tasks: [{ text: 'Share revised quote of ₹17.5L', due: '2026-10-27' }], activities: [{ type: 'meeting', text: 'Negotiation call with MD. Asked for 5% discount.', date: '2026-10-20' }] },
    { company: 'Brightpath Edu', project: 'Learning management system', value: 1200000, contact: 'Meera Pillai, Director', city: 'Bengaluru', source: 'Referral', priority: 'Warm', stage: 'won', expectedClose: '2026-10-18',
      activities: [{ type: 'won', text: 'Won. Advance payment received by Mariox.', date: '2026-10-18' }] },
    { company: 'Nimbus Travel', project: 'Itinerary app', value: 700000, contact: 'Farhan Ali, CEO', city: 'Delhi', source: 'LinkedIn', priority: 'Cold', stage: 'lost', lostReason: 'Went with competitor', expectedClose: '2026-10-10',
      activities: [{ type: 'stage', text: 'Marked lost: Went with competitor', date: '2026-10-10' }] },
  ].map(l => ({ ...l, owner })));

  await Project.insertMany([
    { client: 'Novatech Logistics', contact: 'Anil Mehta', city: 'Gurugram', title: 'Fleet tracking platform', deal: 1000000, closedAt: '2026-08-04', stage: 1, pm: 'Priya Nair',
      update: 'Design sign-off review scheduled with the client on 3 Nov.', milestones: ['2026-08-28', '2026-11-03', '2027-01-15', '2027-02-01', '2027-02-10'],
      payments: [{ label: 'Advance (25%)', amount: 250000, due: '2026-08-12', status: 'received', releasedAt: '2026-08-18', utr: 'UTR 6081822' }, { label: 'Design sign-off', amount: 250000, due: '2026-11-05', status: 'due' }, { label: 'Beta release', amount: 250000, due: '2026-12-20', status: 'upcoming' }, { label: 'Go-live', amount: 250000, due: '2027-02-10', status: 'upcoming' }] },
    { client: 'MedCare Clinics', contact: 'Dr. Sana Kapoor', city: 'Noida', title: 'Patient app & doctor dashboard', deal: 1800000, closedAt: '2026-05-20', stage: 3, pm: 'Arjun Rao',
      update: 'UAT round 1 complete. 14 of 18 issues fixed; round 2 starts 2 Nov.', milestones: ['2026-06-10', '2026-07-15', '2026-10-10', '2026-11-20', '2026-12-15'],
      payments: [{ label: 'Advance (30%)', amount: 540000, due: '2026-06-02', status: 'received', releasedAt: '2026-06-08', utr: 'UTR 6060811' }, { label: 'Development M1', amount: 450000, due: '2026-09-22', status: 'received', releasedAt: '2026-09-27', utr: 'UTR 6092704' }, { label: 'Development M2', amount: 450000, due: '2026-10-20', status: 'received' }, { label: 'Go-live', amount: 360000, due: '2026-12-15', status: 'upcoming' }] },
    { client: 'Brightpath Edu', contact: 'Meera Pillai', city: 'Bengaluru', title: 'Learning management system', deal: 1200000, closedAt: '2026-10-18', stage: 0, pm: 'Karan Verma',
      update: 'Kickoff done. Requirement workshops running this week.', milestones: ['2026-11-08', '2026-12-01', '2027-02-01', '2027-03-01', '2027-03-15'],
      payments: [{ label: 'Advance (30%)', amount: 360000, due: '2026-10-25', status: 'received' }, { label: 'Design approval', amount: 240000, due: '2026-12-01', status: 'upcoming' }, { label: 'Development', amount: 360000, due: '2027-02-01', status: 'upcoming' }, { label: 'Launch', amount: 240000, due: '2027-03-15', status: 'upcoming' }] },
  ].map(x => ({ ...x, owner })));

  await Scope.insertMany([
    { owner, client: 'Brightpath Edu', project: 'Learning management system', submitted: 1200000, approved: 1200000, status: 'approved', comment: 'Approved. A mobile app phase can be quoted separately.' },
    { owner, client: 'Zenith Realty', project: 'CRM and broker app', submitted: 1500000, approved: 1750000, status: 'revised', comment: 'Broker app needs offline sync, so the development estimate is revised.' },
    { owner, client: 'Orbit Foods', project: 'Self-ordering kiosk', submitted: 800000, status: 'review', comment: 'Solutions team is reviewing.',
      lines: [{ name: 'Discovery & UX', amount: 150000 }, { name: 'Kiosk app', amount: 500000 }, { name: 'Admin panel', amount: 150000 }] },
  ]);
  await Booking.create({ owner, client: 'UrbanKart Retail', office: 'Bangalore', date: '2026-10-30', time: '11:30', purpose: 'Solution demo', team: 'Tech Lead', guests: 3, status: 'Confirmed' });
  await TechRequest.create({ owner, type: 'Technical scoping', client: 'Brightpath Edu', date: '2026-10-29', time: '15:00', duration: '60 min', mode: 'Zoom', status: 'assigned', assignee: 'Karan Verma, Solution architect' });
  await Ticket.deleteMany({ code: { $in: ['TK-2041', 'TK-2058'] } });
  await Ticket.insertMany([
    { owner, code: 'TK-2041', subject: 'TDS certificate for Q2', category: 'Commission & payout', status: 'completed', assignee: 'Ritika Malhotra' },
    { owner, code: 'TK-2058', subject: 'Need Healthcare case study in Hindi', category: 'Sales resources', status: 'assigned', assignee: 'Marketing team' },
  ]);
  console.log(`partner  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function seedShared() {
  if (!(await Resource.estimatedDocumentCount())) {
    await Resource.insertMany([
      { type: 'Case study', industry: 'Logistics', title: 'Real-time fleet tracking for a national logistics operator', format: 'PDF', size: '4.2 MB' },
      { type: 'Case study', industry: 'Healthcare', title: 'Telemedicine app for a multi-city clinic chain', format: 'PDF', size: '3.8 MB' },
      { type: 'Case study', industry: 'Retail', title: 'Headless e-commerce rebuild with 2× faster checkout', format: 'PDF', size: '5.1 MB' },
      { type: 'Portfolio', industry: 'All', title: 'Mariox portfolio 2026', format: 'PDF', size: '18 MB' },
      { type: 'Deck', industry: 'All', title: 'Mariox company profile', format: 'PPTX', size: '12 MB' },
      { type: 'Deck', industry: 'All', title: 'Partner pitch deck (co-branded)', format: 'PPTX', size: '8.6 MB' },
      { type: 'Brochure', industry: 'All', title: 'Services and engagement models', format: 'PDF', size: '1.6 MB' },
      { type: 'Brochure', industry: 'AI', title: 'AI and automation services', format: 'PDF', size: '2.2 MB' },
    ]);
  }
  await Setting.updateOne(
    { key: 'portal' },
    { $setOnInsert: { contacts: [
      { title: 'Founder', name: 'Founder name', role: 'Founder & CEO', phone: '', email: '', note: 'For strategic deals, large enterprise pitches and partnership terms.' },
      { title: 'Co-founder', name: 'Co-founder name', role: 'Co-founder', phone: '', email: '', note: 'For delivery escalations and technical commitments.' },
    ] } },
    { upsert: true },
  );
}

async function main() {
  await connectDB();
  await Promise.all([User, Lead, Project, Scope, Booking, TechRequest, Ticket, Resource, Setting].map(m => m.init()));
  await seedAdmin();
  if (!process.argv.includes('--admin-only')) {
    await seedDemo();
    await seedShared();
  }
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
