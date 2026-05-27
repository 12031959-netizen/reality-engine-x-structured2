const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTest() {
  console.log("=== STARTING MOOD LOG INTEGRATION TESTS ===");
  const testId = Date.now();
  const signupPayload = {
    name: `Test Mood User ${testId}`,
    username: `mood_tester_${testId}`,
    email: `mood_tester_${testId}@example.com`,
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
    console.log("✓ Signup Successful! User ID:", signupData.account.id);
    const userId = signupData.account.id;

    // Verify initial empty state
    console.log("Initial Daily Check-in:", signupData.account.dailyCheckIn);
    console.log("Initial Mood Logs Count:", signupData.account.moodLogs.length);

    // 2. Log today's daily check-in (which should mirror to MoodLog table)
    console.log("\n2. Testing Daily Check-In Mirroring to MoodLog Table...");
    const checkinPayload = {
      checkInDate: new Date().toISOString().slice(0, 10),
      calories: "2100",
      protein: "140",
      water: "2.8",
      sleep: "8.2",
      mood: "9",
      stress: "2",
      cravings: "1",
      notes: "Feeling great today, full of energy!"
    };

    const checkinRes = await fetch(`${BASE_URL}/accounts/${userId}/daily-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkinPayload)
    });

    if (!checkinRes.ok) {
      throw new Error(`Daily check-in failed: ${checkinRes.statusText}`);
    }

    const checkinData = await checkinRes.json();
    console.log("✓ Daily Check-in Saved successfully!");
    console.log("Updated dailyCheckIn:", checkinData.account.dailyCheckIn);
    console.log("Updated moodLogs array size:", checkinData.account.moodLogs.length);
    
    if (checkinData.account.moodLogs.length === 0) {
      throw new Error("FAIL: MoodLog table did not sync from daily check-in!");
    }
    console.log("✓ Success! MoodLog sync verified. Entry:", checkinData.account.moodLogs[0]);

    // 3. Testing Direct Mood Log (which should update the existing daily record)
    console.log("\n3. Testing Direct Mood Log Update...");
    const moodLogPayload = {
      date: new Date().toISOString().slice(0, 10),
      moodLevel: "6", // Change mood from 9 to 6
      stressLevel: "5",
      cravingLevel: "4",
      sleepHours: "7.5",
      motivationLevel: "8",
      consistencyStatus: "Tracking"
    };

    const moodLogRes = await fetch(`${BASE_URL}/accounts/${userId}/mood-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(moodLogPayload)
    });

    if (!moodLogRes.ok) {
      throw new Error(`Direct mood log failed: ${moodLogRes.statusText}`);
    }

    console.log("✓ Direct Mood Log POST successful!");

    // Fetch updated account state
    const refreshRes = await fetch(`${BASE_URL}/accounts/${userId}`);
    const refreshData = await refreshRes.json();
    const updatedLogs = refreshData.account.moodLogs;
    
    console.log("Refreshed mood logs size:", updatedLogs.length);
    console.log("Refreshed mood log entry:", updatedLogs[0]);

    if (Number(updatedLogs[0].moodLevel) !== 6 || updatedLogs[0].consistencyStatus !== "Tracking") {
      throw new Error("FAIL: MoodLog update was not saved/applied properly!");
    }
    console.log("✓ Success! Direct Mood Log updating verified!");

    console.log("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("\n❌ TEST FAILURE:", error.message);
    process.exit(1);
  }
}

runTest();
