import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Error: Please provide the path to your preset folder.");
  console.log("Usage: npm run package-preset ./my-raw-preset-folder");
  process.exit(1);
}

const sourceDir = path.resolve(process.cwd(), args[0]);

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Error: Directory does not exist: ${sourceDir}`);
  process.exit(1);
}

// Ensure manifest.json exists
const manifestPath = path.join(sourceDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error("❌ Error: Missing manifest.json in the folder.");
  console.log("Please create a manifest.json file containing at least: { \"name\": \"Preset Name\" }");
  process.exit(1);
}

// Read preset name from manifest
let presetName = "Unnamed Preset";
try {
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifestData.name) {
    presetName = manifestData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
} catch (e) {
  console.error("❌ Error: manifest.json is invalid JSON.");
  process.exit(1);
}

const outputDir = path.resolve(process.cwd(), 'dist-presets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const outputFile = path.join(outputDir, `${presetName}.padsphere`);
const output = fs.createWriteStream(outputFile);
const archive = new ZipArchive({
  zlib: { level: 9 } // Highest compression
});

output.on('close', function() {
  console.log(`\n✅ Success! Preset packaged securely.`);
  console.log(`📦 Output File: ${outputFile}`);
  console.log(`📏 Total Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`This .padsphere file is now ready to be sold and distributed to your users!`);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Append files from the source directory
archive.directory(sourceDir, false);

console.log(`Packaging preset from: ${sourceDir}...`);
archive.finalize();
