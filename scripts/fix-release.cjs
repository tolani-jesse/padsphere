const { execSync } = require('child_process');
const fs = require('fs');

const DRAFT_ID = "343137070";
const LIVE_ID = "343137044";

console.log("Fetching draft assets...");
const draftRelease = JSON.parse(execSync(`gh api repos/tolani-jesse/padsphere/releases/${DRAFT_ID}`).toString());

draftRelease.assets.forEach(asset => {
  console.log(`Downloading ${asset.name}...`);
  execSync(`gh api -H "Accept: application/octet-stream" repos/tolani-jesse/padsphere/releases/assets/${asset.id} > "${asset.name}"`);
});

console.log("Fetching live updater.json...");
execSync(`gh release download v1.0.1 -p "updater.json" --clobber`);

const draftLatest = JSON.parse(fs.readFileSync('latest.json', 'utf8'));
const liveUpdater = JSON.parse(fs.readFileSync('updater.json', 'utf8'));

// Merge platforms
liveUpdater.platforms = { ...liveUpdater.platforms, ...draftLatest.platforms };

fs.writeFileSync('updater_merged.json', JSON.stringify(liveUpdater, null, 2));

console.log("Uploading to live release...");
execSync(`gh release upload v1.0.1 PadSphere_1.0.1_universal.dmg PadSphere_universal.app.tar.gz PadSphere_universal.app.tar.gz.sig updater_merged.json#updater.json --clobber`);

console.log("Deleting draft release...");
execSync(`gh api -X DELETE repos/tolani-jesse/padsphere/releases/${DRAFT_ID}`);

console.log("Done!");
