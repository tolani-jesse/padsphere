import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];
if (!version) {
  console.error("Usage: npm run release <version>");
  process.exit(1);
}

console.log(`🚀 Preparing Cloud Release for v${version}...`);

// Update package.json
const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Update tauri.conf.json
const tauriPath = path.resolve(process.cwd(), 'src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriPath, JSON.stringify(tauriConf, null, 2) + '\n');

console.log(`☁️  Pushing to GitHub to trigger Cloud Build (Mac, Windows, Linux)...`);

try {
  // Commit the version bump
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "Bump version to v${version}"`, { stdio: 'inherit' });
  
  // Create and push the tag
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  execSync(`git push origin main`, { stdio: 'inherit' });
  execSync(`git push origin v${version}`, { stdio: 'inherit' });
  
  console.log(`\n✅ Success! The GitHub Actions servers are now building your Mac and Windows installers.`);
  console.log(`Check your GitHub repository 'Actions' tab to watch the progress!`);
} catch (e) {
  console.error("❌ Failed to push to GitHub. Make sure your git repo is clean and origin is set.");
}
