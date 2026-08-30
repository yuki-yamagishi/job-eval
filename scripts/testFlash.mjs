const key = process.argv[2] || process.env.GEMINI_API_KEY || "";
if (!key) {
  console.log("Usage: node scripts/testFlash.mjs <GEMINI_API_KEY>");
  process.exit(0);
}

async function testModel(modelName) {
  console.log(`\nTesting ${modelName}...`);
  try {
    const postRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Respond in JSON: {\"status\":\"success\",\"message\":\"Working properly!\"}" }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    console.log(`Status: ${postRes.status} ${postRes.statusText}`);
    const text = await postRes.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

async function main() {
  await testModel("gemini-3.7-flash");
  await testModel("gemini-3.6-flash");
  await testModel("gemini-flash-latest");
}

main();
