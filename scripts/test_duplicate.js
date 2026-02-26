// Test duplicate slip upload
// Run with: node scripts/test_duplicate.js

const BASE_URL = "http://localhost:3000";

async function postReceipt(imageUrl, imageTitle) {
  const res = await fetch(`${BASE_URL}/api/process-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, imageTitle }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  // Pick one of the local slip images already in the slips/ folder
  // We use a public URL here just to trigger OCR; what matters is the duplicate DB check
  // So we'll call it twice and see if both succeed
  const testImageUrl =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg";

  console.log("=== First upload (should succeed, not duplicate) ===");
  const first = await postReceipt(testImageUrl, "test-slip-1");
  console.log("Status:", first.status);
  console.log("Body:", JSON.stringify(first.body, null, 2));

  console.log("\n=== Second upload with SAME imageUrl (duplicate scenario) ===");
  const second = await postReceipt(testImageUrl, "test-slip-1-duplicate");
  console.log("Status:", second.status);
  console.log("Body:", JSON.stringify(second.body, null, 2));

  // Evaluate result
  if (second.status === 409) {
    console.log("\n❌ FAIL: Duplicate was BLOCKED (409) — old behaviour still present.");
    process.exit(1);
  } else if (second.body && second.body.success && second.body.isDuplicate === true) {
    console.log("\n✅ PASS: Duplicate was ALLOWED and saved with isDuplicate: true");
  } else if (second.body && second.body.success && second.body.isDuplicate === false) {
    console.log("\n⚠️  NOTE: Second upload succeeded but isDuplicate=false (may be same OCR returning different fields)");
  } else {
    console.log("\n⚠️  Unexpected response — check above output.");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
