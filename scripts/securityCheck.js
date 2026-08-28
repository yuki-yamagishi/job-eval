import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Patterns to detect real API keys and secrets
const SECRET_PATTERNS = [
  { name: "Google API Key (Real)", regex: /AIzaSy[A-Za-z0-9_-]{35}/ },
  { name: "OpenAI Secret Key", regex: /sk-[A-Za-z0-9]{32,}/ },
  { name: "Anthropic API Key", regex: /sk-ant-api[A-Za-z0-9_-]{32,}/ },
  { name: "GitHub Personal Access Token", regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: "Private Key", regex: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/ },
];

// Target directories to scan
const SCAN_DIRS = ["src", "tests", "docs", ".github"];
const IGNORED_EXTENSIONS = [".png", ".jpg", ".ico", ".woff", ".woff2"];

let hasError = false;

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTENSIONS.includes(ext)) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const relativePath = path.relative(rootDir, fullPath);

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          console.error(`❌ [SECURITY ALERT] ${pattern.name} detected in: ${relativePath}`);
          hasError = true;
        }
      }
    }
  }
}

console.log("🔒 Running Automated Security & Secret Leak Check...");

for (const dir of SCAN_DIRS) {
  scanDirectory(path.join(rootDir, dir));
}

if (hasError) {
  console.error("❌ Security check failed! Real API keys or secrets were detected. Remove them before committing.");
  process.exit(1);
} else {
  console.log("✅ Security & Secret Check PASSED: No real API keys or sensitive credentials found.");
  process.exit(0);
}
