const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTest() {
  console.log("=== STARTING FOOD LOG INTEGRATION TESTS ===");
  const testId = Date.now();
  const signupPayload = {
    name: `Food Tester ${testId}`,
    username: `food_tester_${testId}`,
    email: `food_tester_${testId}@example.com`,
    password: "password123"
  };

  try {
    // 1. Sign up a new user
    console.log("\n1. Testing Signup Endpoint...");
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupPayload)
    });
    
    if (!signupRes.ok) {
      throw new Error(`Signup failed: ${signupRes.statusText}`);
    }
    
    const signupData = await signupRes.json();
    const userId = signupData.account.id;
    console.log("✓ Signup Successful! User ID:", userId);

    // 2. Post a Food Log with empty string inputs (simulating empty optional inputs from frontend)
    console.log("\n2. Posting Food Log with empty optional numeric fields...");
    const logPayload = {
      mealName: "Snack & Shake",
      calories: "",       // Empty string to test WAMP SQL strict mode compatibility
      protein: "35",
      carbs: "",          // Empty string
      fats: "",           // Empty string
      waterintake: ""     // Empty string
    };

    const logRes = await fetch(`${BASE_URL}/accounts/${userId}/food-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logPayload)
    });

    const logData = await logRes.json();
    if (!logRes.ok) {
      throw new Error(`Food Log POST failed with error: ${JSON.stringify(logData)}`);
    }
    console.log("✓ Food Log Saved successfully response:", logData);

    // 3. Fetch updated account state to verify the foodLogs array from database
    console.log("\n3. Fetching updated account to verify database saving...");
    const refreshRes = await fetch(`${BASE_URL}/accounts/${userId}`);
    const refreshData = await refreshRes.json();
    const history = refreshData.account.foodLogs || [];
    
    console.log("Saved Food Logs length:", history.length);
    if (history.length === 0) {
      throw new Error("FAIL: Food logs were returned as saved but not present in database/account.foodLogs!");
    }

    console.log("✓ Verified entry in FoodLog table:", history[0]);
    console.log("\n=== ALL FOOD LOG TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ TEST FAILURE:", error.message);
    process.exit(1);
  }
}

runTest();
