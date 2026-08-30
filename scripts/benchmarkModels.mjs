const key = process.argv[2] || process.env.GEMINI_API_KEY || "";
if (!key) {
  console.log("Usage: node scripts/benchmarkModels.mjs <GEMINI_API_KEY>");
  process.exit(0);
}

async function testModel(modelName) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const postRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hi! Output JSON: {\"status\":\"ok\"}" }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const text = await postRes.text();
    console.log(`[${modelName}] Status: ${postRes.status} (${elapsed}ms) -> ${text.slice(0, 100)}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`[${modelName}] ERROR (${elapsed}ms): ${err.message}`);
  }
}

async function main() {
  await testModel("gemini-3.6-flash");
  await testModel("gemini-3.5-flash");
  await testModel("gemini-3.1-flash-lite");
  await testModel("gemini-3.1-pro-preview");
  await testModel("gemini-3.7-flash");
}

main();
