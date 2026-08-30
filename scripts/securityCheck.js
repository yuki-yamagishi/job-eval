import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Comprehensive Secret & Credential Detection Patterns
const SECRET_PATTERNS = [
  { name: "Google API Key (AIza...)", regex: /AIzaSy[A-Za-z0-9_-]{35}/ },
  { name: "Google Cloud / Gemini API Token (AQ...)", regex: /AQ\.[A-Za-z0-9_-]{30,}/ },
  { name: "OpenAI Secret Key", regex: /sk-[A-Za-z0-9]{32,}/ },
  { name: "Anthropic API Key", regex: /sk-ant-api[A-Za-z0-9_-]{32,}/ },
  { name: "GitHub Personal Access Token", regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: "AWS Access Key ID", regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: "Private Key", regex: /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/ },
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".system_generated",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".webp",
  ".lock",
]);

let hasError = false;
let scannedFileCount = 0;

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTENSIONS.has(ext)) continue;

      // Skip this security script itself so pattern strings aren't falsely detected
      if (fullPath === __filename) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const relativePath = path.relative(rootDir, fullPath);
        scannedFileCount++;

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(content)) {
            console.error(`❌ [CRITICAL SECURITY ALERT] ${pattern.name} detected in: ${relativePath}`);
            hasError = true;
          }
        }
      } catch (err) {
        // Skip unreadable binary files
      }
    }
  }
}

console.log("🔒 Running Automated Security & Secret Leak Check (All Directories)...");

scanDirectory(rootDir);

console.log(`🔍 Scanned ${scannedFileCount} files for secrets across entire workspace.`);

if (hasError) {
  console.error("❌ Security check FAILED! Real API keys or sensitive credentials detected. Remove them immediately.");
  process.exit(1);
} else {
  console.log("✅ Security & Secret Check PASSED: 0 secrets found. Clean.");
  process.exit(0);
}
