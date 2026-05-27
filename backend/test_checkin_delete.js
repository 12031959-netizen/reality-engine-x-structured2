const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTest() {
  console.log("=== STARTING CHECK-IN DELETE INTEGRATION TESTS ===");
  const testId = Date.now();
  const signupPayload = {
    name: `Delete Tester ${testId}`,
    username: `del_tester_${testId}`,
    email: `del_tester_${testId}@example.com`,
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

    // 2. Submit a check-in
    console.log("\n2. Submitting daily check-in...");
    const checkinPayload = {
      checkInDate: "2026-05-18",
      calories: "2200",
      protein: "140",
      water: "3",
      sleep: "8",
      mood: "8",
      stress: "4",
      cravings: "2",
      notes: "Feeling strong today."
    };

    const saveRes = await fetch(`${BASE_URL}/accounts/${userId}/daily-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkinPayload)
    });

    if (!saveRes.ok) {
      throw new Error("Failed to save check-in");
    }
    const saveData = await saveRes.json();
    console.log("✓ Saved check-in! Daily History length:", saveData.account.dailyHistory.length);

    // 3. Verify check-in is logged
    const initialHistory = saveData.account.dailyHistory.filter(h => h.checkIn);
    if (initialHistory.length === 0) {
      throw new Error("FAIL: Check-in was not saved in dailyHistory!");
    }
    console.log("✓ Verified check-in is present in database");

    // 4. Perform Deletion
    console.log("\n4. Deleting daily check-in for 2026-05-18...");
    const deleteRes = await fetch(`${BASE_URL}/accounts/${userId}/daily-checkin/2026-05-18`, {
      method: "DELETE"
    });

    if (!deleteRes.ok) {
      const errData = await deleteRes.json();
      throw new Error(`Deletion endpoint failed: ${JSON.stringify(errData)}`);
    }

    const deleteData = await deleteRes.json();
    console.log("✓ Deletion successful!");

    // 5. Verify it is gone from user account state
    const postHistory = deleteData.account.dailyHistory.filter(h => h.checkIn);
    if (postHistory.length > 0) {
      throw new Error("FAIL: Check-in was not deleted from database!");
    }
    console.log("✓ Verified check-in is completely gone from dailyHistory!");

    console.log("\n=== ALL CHECK-IN DELETE TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ TEST FAILURE:", error.message);
    process.exit(1);
  }
}

runTest();
