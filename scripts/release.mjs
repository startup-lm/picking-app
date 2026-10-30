#!/usr/bin/env node

/**
 * 🚀 PickingApp Monorepo Unified Release Script
 *
 * Sincroniza versiones en:
 *  - package.json (raíz)
 *  - apps/web/package.json
 *  - apps/mobile/package.json
 *  - apps/mobile/app.json (version y android.versionCode)
 *
 * Actualiza CHANGELOG.md, crea archivo de Release Notes en .github/releases/
 * y opcionalmente genera commit y git tag.
 *
 * Uso:
 *   npm run release:patch     (1.0.9 -> 1.0.10)
 *   npm run release:minor     (1.0.9 -> 1.1.0)
 *   npm run release:major     (1.0.9 -> 2.0.0)
 *   npm run release -- 1.2.0  (versión personalizada)
 *   npm run release -- patch --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Rutas de archivos a versionar
const PATHS = {
  rootPkg: path.join(ROOT_DIR, 'package.json'),
  webPkg: path.join(ROOT_DIR, 'apps/web/package.json'),
  mobilePkg: path.join(ROOT_DIR, 'apps/mobile/package.json'),
  mobileAppJson: path.join(ROOT_DIR, 'apps/mobile/app.json'),
  changelog: path.join(ROOT_DIR, 'CHANGELOG.md'),
  releasesDir: path.join(ROOT_DIR, '.github/releases'),
};

// Parsear argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const noGit = args.includes('--no-git');
const bumpTypeOrVersion = args.find(a => !a.startsWith('--')) || 'patch';

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function parseSemver(versionStr) {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Versión semver inválida: "${versionStr}". Debe ser de formato X.Y.Z`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function computeNextVersion(currentVersion, bumpType) {
  const sem = parseSemver(currentVersion);
  if (bumpType === 'major') {
    return `${sem.major + 1}.0.0`;
  }
  if (bumpType === 'minor') {
    return `${sem.major}.${sem.minor + 1}.0`;
  }
  if (bumpType === 'patch') {
    return `${sem.major}.${sem.minor}.${sem.patch + 1}`;
  }
  // Si el usuario pasó una versión explícita (ej: 1.2.0)
  parseSemver(bumpType);
  return bumpType;
}

function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateChangelog(newVersion, today) {
  if (!fs.existsSync(PATHS.changelog)) {
    console.warn('⚠️ CHANGELOG.md no encontrado, se creará uno nuevo.');
    fs.writeFileSync(
      PATHS.changelog,
      `# Changelog\n\nTodos los cambios notables de este proyecto se documentan en este archivo.\n\n## [${newVersion}] - ${today}\n\n### Added\n- Release unificada de PickingApp v${newVersion}.\n`,
      'utf-8'
    );
    return;
  }

  let content = fs.readFileSync(PATHS.changelog, 'utf-8');
  const unreleasedRegex = /##\s*\[Unreleased\]\s*\n([\s\S]*?)(?=(##\s*\[|$))/i;
  const match = content.match(unreleasedRegex);

  let unreleasedNotes = '';
  if (match && match[1].trim()) {
    unreleasedNotes = match[1].trim();
  } else {
    unreleasedNotes = `### Added\n- Mejoras y correcciones en la versión ${newVersion}.\n`;
  }

  const newSection = `## [Unreleased]\n\n## [${newVersion}] - ${today}\n\n${unreleasedNotes}\n\n`;

  if (match) {
    content = content.replace(unreleasedRegex, newSection);
  } else {
    content = content.replace(/# Changelog\s*\n/i, `# Changelog\n\n${newSection}`);
  }

  if (!isDryRun) {
    fs.writeFileSync(PATHS.changelog, content, 'utf-8');
  }

  // Generar archivo individual de Release Notes
  if (!fs.existsSync(PATHS.releasesDir)) {
    fs.mkdirSync(PATHS.releasesDir, { recursive: true });
  }

  const releaseNoteFile = path.join(PATHS.releasesDir, `RELEASE_v${newVersion}.md`);
  const releaseNoteContent = `# PickingApp v${newVersion} (${today})\n\n${unreleasedNotes}\n\n---\n*Generado automáticamente por el script de release de PickingApp.*`;

  if (!isDryRun) {
    fs.writeFileSync(releaseNoteFile, releaseNoteContent, 'utf-8');
    console.log(`📄 Release notes generadas en: .github/releases/RELEASE_v${newVersion}.md`);
  }
}

async function run() {
  console.log('📦 PickingApp - Monorepo Release Tool');
  console.log('====================================');

  // Leer versiones actuales
  const rootPkg = readJson(PATHS.rootPkg);
  const webPkg = readJson(PATHS.webPkg);
  const mobilePkg = readJson(PATHS.mobilePkg);
  const mobileAppJson = readJson(PATHS.mobileAppJson);

  // Tomamos como referencia de versión la de app.json o package.json raíz
  const baseVersion = mobileAppJson.expo?.version || rootPkg.version || mobilePkg.version || '1.0.0';
  const newVersion = computeNextVersion(baseVersion, bumpTypeOrVersion);
  const currentVersionCode = mobileAppJson.expo?.android?.versionCode ?? 1;
  const newVersionCode = currentVersionCode + 1;
  const today = getTodayIso();

  console.log(`📌 Versión actual:    v${baseVersion} (Android versionCode: ${currentVersionCode})`);
  console.log(`🎯 Nueva versión:      v${newVersion} (Android versionCode: ${newVersionCode})`);
  console.log(`📅 Fecha de release:   ${today}`);
  if (isDryRun) console.log('⚠️  MODO DRY-RUN: No se aplicarán cambios a disco ni git.');

  if (!isDryRun) {
    // 1. Actualizar package.json raíz
    rootPkg.version = newVersion;
    writeJson(PATHS.rootPkg, rootPkg);
    console.log('✅ Actualizado package.json (raíz)');

    // 2. Actualizar apps/web/package.json
    webPkg.version = newVersion;
    writeJson(PATHS.webPkg, webPkg);
    console.log('✅ Actualizado apps/web/package.json');

    // 3. Actualizar apps/mobile/package.json
    mobilePkg.version = newVersion;
    writeJson(PATHS.mobilePkg, mobilePkg);
    console.log('✅ Actualizado apps/mobile/package.json');

    // 4. Actualizar apps/mobile/app.json
    if (!mobileAppJson.expo) mobileAppJson.expo = {};
    mobileAppJson.expo.version = newVersion;
    if (!mobileAppJson.expo.android) mobileAppJson.expo.android = {};
    mobileAppJson.expo.android.versionCode = newVersionCode;
    writeJson(PATHS.mobileAppJson, mobileAppJson);
    console.log('✅ Actualizado apps/mobile/app.json (version y versionCode)');

    // 5. Actualizar CHANGELOG.md y crear release notes
    updateChangelog(newVersion, today);
    console.log('✅ Actualizado CHANGELOG.md');

    // 6. Operaciones Git
    if (!noGit) {
      try {
        const filesToAdd = [
          PATHS.rootPkg,
          PATHS.webPkg,
          PATHS.mobilePkg,
          PATHS.mobileAppJson,
          PATHS.changelog,
          PATHS.releasesDir,
        ].join(' ');

        execSync(`git add ${filesToAdd}`, { cwd: ROOT_DIR, stdio: 'inherit' });
        execSync(`git commit -m "chore(release): bump version to v${newVersion}"`, {
          cwd: ROOT_DIR,
          stdio: 'inherit',
        });
        execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`, {
          cwd: ROOT_DIR,
          stdio: 'inherit',
        });
        console.log(`🏷️ Tag git creado: v${newVersion}`);
        console.log(`\n🚀 ¡Release v${newVersion} completada con éxito!`);
        console.log(`Para publicar los cambios y el tag en GitHub, ejecutá:`);
        console.log(`   git push origin main --tags\n`);
      } catch (err) {
        console.warn(`⚠️ Git commit o tag falló o no fue completado: ${err.message}`);
      }
    }
  } else {
    updateChangelog(newVersion, today);
    console.log('🔎 Simulación finalizada con éxito.');
  }
}

run().catch(err => {
  console.error('❌ Error en el proceso de release:', err);
  process.exit(1);
});
