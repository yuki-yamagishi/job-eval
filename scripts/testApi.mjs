const key = process.argv[2] || process.env.GEMINI_API_KEY || "";
if (!key) {
  console.log("Usage: node scripts/testApi.mjs <GEMINI_API_KEY>");
  process.exit(0);
}

async function main() {
  console.log("1. Testing GET /models...");
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log("Total models:", data.models?.length);
    const contentModels = data.models?.filter(m => m.supportedGenerationMethods?.includes("generateContent")) || [];
    console.log("generateContent models:");
    contentModels.forEach(m => console.log(" - " + m.name));

    // Try generateContent with each candidate model
    for (const m of contentModels.slice(0, 5)) {
      const modelName = m.name.replace(/^models\//, "");
      console.log(`\n2. Testing POST /models/${modelName}:generateContent...`);
      const postRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Hello, return JSON: {\"status\":\"ok\"}" }] }]
        })
      });
      console.log(`Status: ${postRes.status} ${postRes.statusText}`);
      const text = await postRes.text();
      console.log("Response (first 200 chars):", text.slice(0, 200));
    }
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

main();
