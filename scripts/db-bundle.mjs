#!/usr/bin/env node

// scripts/db-bundle.mjs
// Concatenates supabase/migrations/*.sql (+ supabase/seed.sql with --seed) into supabase/dist/setup.sql

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const includeSeed = args.includes('--seed');

const rootDir = process.cwd();
const migrationsDir = path.resolve(rootDir, 'supabase/migrations');
const seedPath = path.resolve(rootDir, 'supabase/seed.sql');
const distDir = path.resolve(rootDir, 'supabase/dist');
const outputFile = path.join(distDir, 'setup.sql');

fs.mkdirSync(distDir, { recursive: true });

let output = '';

if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    output += `-- ==== ${file} ====\n${content.trim()}\n\n`;
  }
}

if (includeSeed && fs.existsSync(seedPath)) {
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  output += `-- ==== seed.sql ====\n${seedContent.trim()}\n\n`;
}

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Bundled into ${outputFile}`);
