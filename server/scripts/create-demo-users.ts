/**
 * Replaces the demo Clerk users: removes the old demo1/demo2@gmail.com accounts, then creates
 * (or resets the password of) the three demo users. No business is created here: they onboard
 * like anyone else, and DEMO_EMAILS gives them a demo pack when they finish.
 *   pnpm demo:users
 */
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const OLD_EMAILS = ['demo1@gmail.com', 'demo2@gmail.com'];

const DEMO_USERS = [
  { email: 'demo1+clerk_test@example.com', password: 'Demo1Signing2026!', username: 'demo1', firstName: 'Demo', lastName: 'One' },
  { email: 'demo2+clerk_test@example.com', password: 'Demo2Signing2026!', username: 'demo2', firstName: 'Demo', lastName: 'Two' },
  { email: 'demo3+clerk_test@example.com', password: 'Demo3Signing2026!', username: 'demo3', firstName: 'Demo', lastName: 'Three' },
];

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error('CLERK_SECRET_KEY is not set (server/.env).');
  process.exit(1);
}
const clerk = createClerkClient({ secretKey });

const findByEmail = async (email: string) => (await clerk.users.getUserList({ emailAddress: [email] })).data[0];

/** Clerk rejects `username` when usernames are turned off for the instance. */
const usernameRejected = (error: unknown) => /username/i.test(JSON.stringify((error as { errors?: unknown })?.errors ?? String(error)));

for (const email of OLD_EMAILS) {
  const user = await findByEmail(email);
  if (!user) continue;
  await clerk.users.deleteUser(user.id);
  console.log(`deleted  ${email}  ${user.id}`);
}

for (const u of DEMO_USERS) {
  const profile = { password: u.password, skipPasswordChecks: true, firstName: u.firstName, lastName: u.lastName };
  const existing = await findByEmail(u.email);
  if (existing) {
    try {
      await clerk.users.updateUser(existing.id, { ...profile, username: u.username });
    } catch (error) {
      if (!usernameRejected(error)) throw error;
      await clerk.users.updateUser(existing.id, profile);
      console.log(`  (usernames are off in this Clerk instance; ${u.username} not set)`);
    }
    console.log(`updated  ${u.email}  ${existing.id}`);
    continue;
  }
  let created;
  try {
    created = await clerk.users.createUser({ ...profile, emailAddress: [u.email], username: u.username });
  } catch (error) {
    if (!usernameRejected(error)) throw error;
    created = await clerk.users.createUser({ ...profile, emailAddress: [u.email] });
    console.log(`  (usernames are off in this Clerk instance; ${u.username} not set)`);
  }
  console.log(`created  ${u.email}  ${created.id}`);
}
