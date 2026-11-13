#!/usr/bin/env node

// scripts/db-create-admin.mjs
// Node 24, no external dependencies, uses native fetch.

import process from 'node:process';

const args = process.argv.slice(2);
let email = '';
let role = 'admin';
let name = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1];
    i++;
  } else if (args[i] === '--role' && args[i + 1]) {
    role = args[i + 1];
    i++;
  } else if (args[i] === '--name' && args[i + 1]) {
    name = args[i + 1];
    i++;
  }
}

if (!email) {
  console.error('Error: --email <email> is required');
  process.exit(1);
}

if (role !== 'admin' && role !== 'operator') {
  console.error('Error: --role must be "admin" or "operator"');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Error: SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');
const authHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const password = process.env.PICKFLOW_USER_PASSWORD;

let authRes;
if (password) {
  authRes = await fetch(`${baseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || undefined },
    }),
  });
} else {
  authRes = await fetch(`${baseUrl}/auth/v1/invite`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email,
      data: { name: name || undefined },
    }),
  });
}

if (!authRes.ok) {
  const errorText = await authRes.text();
  console.error(`Error: User creation failed with status ${authRes.status}: ${errorText}`);
  process.exit(1);
}

const userJson = await authRes.json();
const userId = userJson.id || userJson.user?.id;

if (!userId) {
  console.error('Error: Could not determine user ID from auth response');
  process.exit(1);
}

const patchRes = await fetch(`${baseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
  method: 'PATCH',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  },
  body: JSON.stringify({
    role,
    is_active: true,
    name: name || '',
  }),
});

if (!patchRes.ok) {
  const patchErrorText = await patchRes.text();
  console.error(`Error: Profile update failed with status ${patchRes.status}: ${patchErrorText}`);
  process.exit(1);
}

console.log(`OK: ${email} (${role}) activo`);
