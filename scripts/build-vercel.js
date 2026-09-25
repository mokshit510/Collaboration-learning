import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  PRAMAAN: Unified Vercel Production Build System');
console.log('================================================================');

const run = (cmd, cwd) => {
  console.log(`\n[Build] Running: "${cmd}" in ${cwd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

// 1. Build Mobile Web Companion
console.log('\n[1/3] Building Mobile Web Companion (mobile-web)...');
const mobileDir = path.join(rootDir, 'mobile-web');
if (fs.existsSync(mobileDir)) {
  if (!fs.existsSync(path.join(mobileDir, 'node_modules'))) {
    run('npm install', mobileDir);
  }
  run('npm run build', mobileDir);
}

// 2. Build Frontend Investigator & Authority Portal
console.log('\n[2/3] Building Frontend Web Application (frontend)...');
const frontendDir = path.join(rootDir, 'frontend');
if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
  run('npm install', frontendDir);
}
run('npm run build', frontendDir);

// 3. Integrate Mobile Companion into frontend/dist/mobile
console.log('\n[3/3] Merging Mobile Companion into frontend/dist/mobile...');
const mobileDist = path.join(mobileDir, 'dist');
const frontendDistMobile = path.join(frontendDir, 'dist', 'mobile');

if (fs.existsSync(mobileDist)) {
  if (!fs.existsSync(frontendDistMobile)) {
    fs.mkdirSync(frontendDistMobile, { recursive: true });
  }
  fs.cpSync(mobileDist, frontendDistMobile, { recursive: true });
  console.log(`✓ Copied ${mobileDist} -> ${frontendDistMobile}`);
}

console.log('\n================================================================');
console.log('  ✓ Production build completed successfully for Vercel!');
console.log('  - Desktop / Investigator Portal: /');
console.log('  - Mobile Companion App:          /mobile');
console.log('================================================================\n');
