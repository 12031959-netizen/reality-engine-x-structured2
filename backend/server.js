import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import nodemailer from "nodemailer";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASS || process.env.MYSQLPASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || "mahmoud_jaber",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email sending skipped: EMAIL_USER or EMAIL_PASS is not configured.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

function shouldSendEmail(emailNotify) {
  return emailNotify === true || emailNotify === "true" || emailNotify === 1 || emailNotify === "1";
}

async function createNotification(userId, { title, message, text, type = "alert" }) {
  const cleanTitle = String(title || "").trim();
  const cleanMessage = String(message || text || "").trim();
  const cleanType = String(type || "alert").trim();

  if (!cleanTitle || !cleanMessage) {
    throw new Error("Notification title and message are required.");
  }

  const [result] = await pool.execute(
    "INSERT INTO notification_log (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [userId, cleanTitle, cleanMessage, cleanType]
  );

  return {
    id: result.insertId,
    user_id: userId,
    title: cleanTitle,
    message: cleanMessage,
    type: cleanType,
    read_status: false,
    created_at: new Date()
  };
}

async function createNotificationAndMaybeEmail(user, { title, message, text, type = "alert", emailNotify = false }) {
  const notification = await createNotification(user.id, { title, message, text, type });
  const emailRequested = shouldSendEmail(emailNotify);
  let emailSent = false;

  if (emailRequested && user.email) {
    emailSent = await sendEmail({
      to: user.email,
      subject: notification.title,
      text: notification.message
    });
  }

  return {
    notification,
    emailRequested,
    emailSent,
    recipient: {
      id: user.id,
      email: user.email || null
    }
  };
}

async function ensureDailyCheckinsTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS daily_checkins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      check_in_date DATE NOT NULL,
      calories INT DEFAULT NULL,
      protein INT DEFAULT NULL,
      water DECIMAL(4,2) DEFAULT NULL,
      sleep DECIMAL(4,2) DEFAULT NULL,
      mood INT DEFAULT NULL,
      stress INT DEFAULT NULL,
      cravings INT DEFAULT NULL,
      notes TEXT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY user_daily_checkin_unique (user_id, check_in_date)
    )
  `);

  const [indexes] = await pool.execute(`
    SELECT INDEX_NAME,
           GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexedColumns,
           MAX(NON_UNIQUE) AS nonUnique
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'daily_checkins'
    GROUP BY INDEX_NAME
  `);

  const hasUniqueDailyKey = indexes.some((index) =>
    index.indexedColumns === "user_id,check_in_date" && Number(index.nonUnique) === 0
  );

  if (hasUniqueDailyKey) return;

  await pool.execute(`
    DELETE older
    FROM daily_checkins older
    INNER JOIN daily_checkins newer
      ON older.user_id = newer.user_id
      AND older.check_in_date = newer.check_in_date
      AND older.id < newer.id
  `);

  await pool.execute(
    "ALTER TABLE daily_checkins ADD UNIQUE KEY user_daily_checkin_unique (user_id, check_in_date)"
  );
}

// Ensure tables exist
async function initDb() {
  try {
    await ensureDailyCheckinsTable();

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50),
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS food_catalog (
        id VARCHAR(80) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        calories DECIMAL(10,2) DEFAULT 0,
        protein DECIMAL(10,2) DEFAULT 0,
        carbs DECIMAL(10,2) DEFAULT 0,
        fats DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS failure_risk_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        check_in_date DATE NOT NULL,
        risk_score INT NOT NULL,
        risk_level VARCHAR(50) NOT NULL,
        risk_message TEXT,
        reasons JSON,
        insights JSON,
        metrics JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Database initialized.");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}
initDb();

// Helper to format user object for frontend
async function getFullUser(userId) {
  const [users] = await pool.execute("SELECT * FROM users WHERE userID = ?", [userId]);
  if (users.length === 0) return null;

  const user = users[0];
  const [profiles] = await pool.execute("SELECT * FROM diet_profiles WHERE user_id = ?", [userId]);
  const [prefs] = await pool.execute("SELECT * FROM user_preferences WHERE user_id = ?", [userId]);
  const [checkins] = await pool.execute("SELECT *, DATE_FORMAT(check_in_date, '%Y-%m-%d') as formatted_date FROM daily_checkins WHERE user_id = ? ORDER BY check_in_date DESC", [userId]);
  const [wearables] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as formatted_date FROM wearable_data WHERE userID = ? ORDER BY date DESC", [userId]);

  const [notifications] = await pool.execute("SELECT * FROM notification_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [userId]);
  const [feedback] = await pool.execute("SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [userId]);

  // New tables data
  const [dietPlans] = await pool.execute("SELECT *, DATE_FORMAT(startDate, '%Y-%m-%d') as startDate, DATE_FORMAT(endDate, '%Y-%m-%d') as endDate FROM DietPlan WHERE userID = ? ORDER BY startDate DESC", [userId]);
  const [foodLogs] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM FoodLog WHERE userID = ? ORDER BY date DESC", [userId]);
  const [moodLogs] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM MoodLog WHERE userID = ? ORDER BY date DESC", [userId]);
  const [progress] = await pool.execute("SELECT progressID, userID, DATE_FORMAT(date, '%Y-%m-%d') as date, weight, bodyMeasurement, progressNote, consistencyScore FROM ProgressTracking WHERE userID = ? ORDER BY date DESC", [userId]);
  const [predictions] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM PredictionResult WHERE userID = ? ORDER BY date DESC", [userId]);
  const [recs] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM Recommendations WHERE userID = ? ORDER BY date DESC", [userId]);
  const [failureRisks] = await pool.execute("SELECT id, user_id, DATE_FORMAT(check_in_date, '%Y-%m-%d') as checkInDate, risk_score as riskScore, risk_level as riskLevel, risk_message as riskMessage, reasons, insights, metrics, created_at as createdAt FROM failure_risk_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId]);

  console.log(`[getFullUser] ID: ${userId}, Progress Entries: ${progress.length}`);

  const profile = profiles[0] || {};
  const preferences = prefs[0] || {};

  return {
    id: user.userID,
    name: user.fullName || user.name, // Support both for safety
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    age: user.age,
    gender: user.gender,
    height: user.height,
    currentWeight: user.currentWeight,
    targetWeight: user.targetWeight,
    activityLevel: user.activityLevel,
    healthGoal: user.healthGoal,
    dietProfile: {
      personName: profile.person_name,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.height_cm,
      currentWeightKg: profile.current_weight_kg,
      targetWeightKg: profile.target_weight_kg,
      goal: profile.goal,
      activityLevel: profile.activity_level,
      dietStyle: profile.diet_style,
      mealsPerDay: profile.meals_per_day,
      allergies: profile.allergies,
      healthConditions: profile.health_conditions,
      targetDate: profile.target_date ? new Date(profile.target_date).toISOString().split('T')[0] : null,
      notes: profile.notes,
      completed: !!profile.completed
    },
    feedbackLog: feedback.map(f => ({
      id: f.id,
      title: f.title,
      type: f.type,
      rating: f.rating,
      message: f.message,
      createdAt: f.created_at
    })),
    preferences: {
      dailyReminders: !!preferences.daily_reminders,
      riskAlerts: !!preferences.risk_alerts,
      weeklySummary: !!preferences.weekly_summary,
      privateMode: !!preferences.private_mode,
      hourlyReminders: !!preferences.hourly_reminders,
      appNotifications: !!preferences.app_notifications,
      emailNotifications: !!preferences.email_notifications,
      remindMood: !!preferences.remind_mood,
      remindFood: !!preferences.remind_food,
      remindWater: !!preferences.remind_water
    },
    notificationLog: notifications.map(n => ({
      id: n.id,
      title: n.title,
      text: n.message,
      type: n.type,
      read: !!n.read_status,
      createdAt: n.created_at
    })),
    dietPlans,
    foodLogs,
    moodLogs,
    progressHistory: progress,
    predictionHistory: predictions,
    recommendationHistory: recs,
    failureRiskHistory: failureRisks.map((risk) => ({
      ...risk,
      reasons: parseJsonField(risk.reasons, []),
      insights: parseJsonField(risk.insights, []),
      metrics: parseJsonField(risk.metrics, {})
    })),
    dailyCheckIn: checkins[0] ? {
      checkInDate: checkins[0].formatted_date,
      calories: checkins[0].calories,
      protein: checkins[0].protein,
      water: checkins[0].water,
      sleep: checkins[0].sleep,
      mood: checkins[0].mood,
      stress: checkins[0].stress,
      cravings: checkins[0].cravings,
      notes: checkins[0].notes,
      savedAt: checkins[0].saved_at
    } : null,
    wearableData: wearables[0] ? {
      wearableDate: wearables[0].formatted_date,
      device: wearables[0].device,
      steps: wearables[0].steps,
      heartRate: wearables[0].heartRate,
      activeMinutes: wearables[0].activityMinutes,
      recoveryScore: wearables[0].recovery_score,
      source: wearables[0].source,
      appleHealthActive: !!wearables[0].apple_health_active,
      iphoneActive: !!wearables[0].iphone_active,
      exportActive: !!wearables[0].export_active,
      bluetoothActive: !!wearables[0].bluetooth_active,
      sleepDuration: wearables[0].sleepDuration,
      caloriesBurned: wearables[0].caloriesBurned,
      savedAt: wearables[0].saved_at
    } : null,
    dailyHistory: (() => {
      const dates = new Set([
        ...checkins.map(c => c.formatted_date),
        ...wearables.map(w => w.formatted_date)
      ]);

      return Array.from(dates).sort((a, b) => b.localeCompare(a)).map(date => {
        const c = checkins.find(check => check.formatted_date === date);
        const w = wearables.find(wear => wear.formatted_date === date);

        return {
          date,
          checkIn: c ? {
            calories: c.calories,
            protein: c.protein,
            water: c.water,
            sleep: c.sleep,
            mood: c.mood,
            stress: c.stress,
            cravings: c.cravings,
            notes: c.notes
          } : null,
          wearableData: w ? {
            device: w.device,
            steps: w.steps,
            heartRate: w.heartRate,
            activeMinutes: w.activityMinutes,
            recoveryScore: w.recovery_score,
            source: w.source,
            sleepDuration: w.sleepDuration
          } : null,
          updatedAt: (c?.saved_at > w?.saved_at) ? c.saved_at : (w?.saved_at || c?.saved_at)
        };
      });
    })()
  };
}

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Reality Engine X API (MySQL-Enhanced)" });
});

app.get("/food-catalog", async (req, res) => {
  try {
    const [foods] = await pool.execute(
      "SELECT id, name, calories, protein, carbs, fats FROM food_catalog ORDER BY name ASC"
    );
    res.json({ ok: true, foods });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auth: Login
app.post("/auth/login", async (req, res) => {
  const { identifier, email, password } = req.body;
  const normalizedIdentifier = String(identifier || email || "").trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    return res.status(400).json({ ok: false, message: "Email/username and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT userID, password FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
      [normalizedIdentifier, normalizedIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: "Username/email or password is incorrect." });
    }

    const userRecord = rows[0];
    const isMatch = await bcrypt.compare(password, userRecord.password);

    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Username/email or password is incorrect." });
    }

    const account = await getFullUser(userRecord.userID);
    res.json({ ok: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auth: Signup
app.post("/auth/signup", async (req, res) => {
  const payload = req.body;
  const userId = `user-${Date.now()}`;

  try {
    const [existing] = await pool.execute(
      "SELECT userID FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
      [payload.username.toLowerCase(), payload.email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ ok: false, message: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    await pool.execute(
      "INSERT INTO users (userID, fullName, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, payload.name, payload.username, payload.email, hashedPassword, "user"]
    );

    await pool.execute("INSERT INTO diet_profiles (user_id, completed) VALUES (?, ?)", [userId, false]);
    await pool.execute("INSERT INTO user_preferences (user_id) VALUES (?)", [userId]);

    const account = await getFullUser(userId);
    res.status(201).json({ ok: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auth: Reset password
app.post("/auth/reset-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and new password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
  }

  try {
    const [users] = await pool.execute(
      "SELECT userID FROM users WHERE LOWER(email) = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ ok: false, message: "No account found for this email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      "UPDATE users SET password = ? WHERE userID = ?",
      [hashedPassword, users[0].userID]
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// New feature routes
app.get("/accounts/:id/diet-plans", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM DietPlan WHERE userID = ? ORDER BY startDate DESC", [req.params.id]);
    res.json({ ok: true, plans: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/accounts/:id/diet-plans", async (req, res) => {
  const { planName, dailyCalories, proteinGoal, carbGoal, fatGoal, startDate, endDate, planStatus } = req.body;
  try {
    await pool.execute(
      "INSERT INTO DietPlan (userID, planName, dailyCalories, proteinGoal, carbGoal, fatGoal, startDate, endDate, planStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [req.params.id, planName, dailyCalories, proteinGoal, carbGoal, fatGoal, startDate, endDate, planStatus || 'active']
    );
    res.status(201).json({ ok: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get("/accounts/:id/food-logs", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM FoodLog WHERE userID = ? ORDER BY date DESC", [req.params.id]);
    res.json({ ok: true, logs: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/accounts/:id/food-logs", async (req, res) => {
  const userId = req.params.id;
  const { date, mealName, calories, protein, carbs, fats, waterintake } = req.body;

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const cleanCalories = (calories !== undefined && calories !== "") ? parseInt(calories, 10) : null;
  const cleanProtein = (protein !== undefined && protein !== "") ? parseInt(protein, 10) : null;
  const cleanCarbs = (carbs !== undefined && carbs !== "") ? parseInt(carbs, 10) : null;
  const cleanFats = (fats !== undefined && fats !== "") ? parseInt(fats, 10) : null;
  const cleanWater = (waterintake !== undefined && waterintake !== "") ? parseFloat(waterintake) : null;

  try {
    await pool.execute(
      "INSERT INTO FoodLog (userID, date, mealName, calories, protein, carbs, fats, waterintake) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, targetDate, mealName, cleanCalories, cleanProtein, cleanCarbs, cleanFats, cleanWater]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Food Log POST error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/accounts/:id/food-logs/:logId", async (req, res) => {
  try {
    await pool.execute(
      "DELETE FROM FoodLog WHERE userID = ? AND foodLogiD = ?",
      [req.params.id, req.params.logId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Food Log DELETE error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/accounts/:id/mood-logs", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM MoodLog WHERE userID = ? ORDER BY date DESC", [req.params.id]);
    res.json({ ok: true, logs: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/accounts/:id/mood-logs", async (req, res) => {
  const { date, moodLevel, stressLevel, cravingLevel, sleepHours, motivationLevel, consistencyStatus } = req.body;
  const cleanMood = (moodLevel !== undefined && moodLevel !== "") ? parseInt(moodLevel, 10) : null;
  const cleanStress = (stressLevel !== undefined && stressLevel !== "") ? parseInt(stressLevel, 10) : null;
  const cleanCravings = (cravingLevel !== undefined && cravingLevel !== "") ? parseInt(cravingLevel, 10) : null;
  const cleanSleep = (sleepHours !== undefined && sleepHours !== "") ? parseFloat(sleepHours) : null;
  const cleanMotivation = (motivationLevel !== undefined && motivationLevel !== "") ? parseInt(motivationLevel, 10) : null;
  const cleanConsistency = (consistencyStatus !== undefined && consistencyStatus !== "") ? consistencyStatus : 'tracked';
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const userId = req.params.id;

  try {
    const [existing] = await pool.execute(
      "SELECT moodLogiD FROM MoodLog WHERE userID = ? AND date = ?",
      [userId, targetDate]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE MoodLog SET 
          moodLevel = ?, stressLevel = ?, cravingLevel = ?, sleepHours = ?, motivationLevel = ?, consistencyStatus = ?
         WHERE userID = ? AND date = ?`,
        [cleanMood, cleanStress, cleanCravings, cleanSleep, cleanMotivation, cleanConsistency, userId, targetDate]
      );
    } else {
      await pool.execute(
        `INSERT INTO MoodLog 
          (userID, date, moodLevel, stressLevel, cravingLevel, sleepHours, motivationLevel, consistencyStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, targetDate, cleanMood, cleanStress, cleanCravings, cleanSleep, cleanMotivation, cleanConsistency]
      );
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("MoodLog POST error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/accounts/:id/progress", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM ProgressTracking WHERE userID = ? ORDER BY date DESC", [req.params.id]);
    res.json({ ok: true, progress: rows });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/accounts/:id/progress", async (req, res) => {
  const { date, weight, bodyMeasurement, progressNote, consistencyScore } = req.body;
  try {
    await pool.execute(
      "INSERT INTO ProgressTracking (userID, date, weight, bodyMeasurement, progressNote, consistencyScore) VALUES (?, ?, ?, ?, ?, ?)",
      [req.params.id, date || new Date().toISOString().slice(0, 10), weight, bodyMeasurement, progressNote, consistencyScore]
    );
    res.status(201).json({ ok: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Admin: Get all accounts
app.get("/admin/accounts", async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT userID, fullName, username, email, role, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC");

    const fullAccounts = await Promise.all(users.map(async (u) => {
      const [profiles] = await pool.execute("SELECT * FROM diet_profiles WHERE user_id = ?", [u.userID]);
      const [checkins] = await pool.execute("SELECT *, DATE_FORMAT(check_in_date, '%Y-%m-%d') as formatted_date FROM daily_checkins WHERE user_id = ? ORDER BY check_in_date DESC", [u.userID]);
      const [wearables] = await pool.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as formatted_date FROM wearable_data WHERE userID = ? ORDER BY date DESC", [u.userID]);

      const profile = profiles[0] || {};

      return {
        ...u,
        id: u.userID,
        name: u.fullName,
        dietProfile: {
          personName: profile.person_name,
          age: profile.age,
          gender: profile.gender,
          heightCm: profile.height_cm,
          currentWeightKg: profile.current_weight_kg,
          targetWeightKg: profile.target_weight_kg,
          goal: profile.goal,
          activityLevel: profile.activity_level,
          dietStyle: profile.diet_style,
          mealsPerDay: profile.meals_per_day,
          completed: !!profile.completed
        },
        dailyCheckIn: checkins[0] ? {
          savedAt: checkins[0].saved_at,
          calories: checkins[0].calories,
          protein: checkins[0].protein,
          water: checkins[0].water,
          sleep: checkins[0].sleep,
          mood: checkins[0].mood,
          stress: checkins[0].stress,
          cravings: checkins[0].cravings
        } : null,
        wearableData: wearables[0] ? {
          savedAt: wearables[0].saved_at,
          device: wearables[0].device,
          steps: wearables[0].steps,
          heartRate: wearables[0].heartRate,
          activeMinutes: wearables[0].activityMinutes,
          source: wearables[0].source
        } : null,
        dailyHistory: checkins.map(c => {
          const w = wearables.find(wear => wear.formatted_date === c.formatted_date);
          return {
            date: c.formatted_date,
            checkIn: { calories: c.calories, protein: c.protein, mood: c.mood },
            wearableData: w ? { device: w.device, steps: w.steps } : null
          };
        })
      };
    }));

    res.json({ accounts: fullAccounts });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Admin: Delete an account and all its related data
app.delete("/admin/accounts/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const tables = [
      { name: "users", col: "userID" },
      { name: "diet_profiles", col: "user_id" },
      { name: "user_preferences", col: "user_id" },
      { name: "daily_checkins", col: "user_id" },
      { name: "wearable_data", col: "userID" },
      { name: "feedback", col: "user_id" },
      { name: "DietPlan", col: "userID" },
      { name: "FoodLog", col: "userID" },
      { name: "MoodLog", col: "userID" },
      { name: "ProgressTracking", col: "userID" },
      { name: "PredictionResult", col: "userID" },
      { name: "Recommendations", col: "userID" },
      { name: "failure_risk_results", col: "user_id" },
      { name: "notification_log", col: "user_id" }
    ];

    for (const t of tables) {
      await pool.execute(`DELETE FROM \`${t.name}\` WHERE \`${t.col}\` = ?`, [userId]);
    }

    res.json({ ok: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE /admin/accounts/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get specific account data
app.get("/accounts/:id", async (req, res) => {
  try {
    const account = await getFullUser(req.params.id);
    if (!account) return res.status(404).json({ message: "User not found" });
    res.json({ ok: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update specific account
app.put("/accounts/:id", async (req, res) => {
  const userId = req.params.id;
  const payload = req.body;

  try {
    // 1. Update users table if user fields are present
    if (payload.fullName || payload.name || payload.username || payload.email || payload.password || payload.age || payload.gender || payload.height || payload.currentWeight || payload.targetWeight || payload.activityLevel || payload.healthGoal) {
      const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : null;
      await pool.execute(
        `UPDATE users SET 
          fullName = COALESCE(?, fullName), 
          username = COALESCE(?, username),
          email = COALESCE(?, email),
          password = COALESCE(?, password),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          height = COALESCE(?, height),
          currentWeight = COALESCE(?, currentWeight),
          targetWeight = COALESCE(?, targetWeight),
          activityLevel = COALESCE(?, activityLevel),
          healthGoal = COALESCE(?, healthGoal)
        WHERE userID = ?`,
        [
          payload.fullName || payload.name || null, payload.username || null, payload.email || null, passwordHash, payload.age || null, payload.gender || null,
          payload.height || null, payload.currentWeight || null, payload.targetWeight || null,
          payload.activityLevel || null, payload.healthGoal || null, userId
        ]
      );
    }

    // 2. Update diet_profiles table if dietProfile is present
    if (payload.dietProfile) {
      const dp = payload.dietProfile;
      await pool.execute(
        `INSERT INTO diet_profiles (
          user_id,
          person_name,
          age,
          gender,
          height_cm,
          current_weight_kg,
          target_weight_kg,
          goal,
          activity_level,
          diet_style,
          meals_per_day,
          allergies,
          health_conditions,
          target_date,
          notes,
          completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          person_name = COALESCE(VALUES(person_name), person_name),
          age = COALESCE(VALUES(age), age),
          gender = COALESCE(VALUES(gender), gender),
          height_cm = COALESCE(VALUES(height_cm), height_cm),
          current_weight_kg = COALESCE(VALUES(current_weight_kg), current_weight_kg),
          target_weight_kg = COALESCE(VALUES(target_weight_kg), target_weight_kg),
          goal = COALESCE(VALUES(goal), goal),
          activity_level = COALESCE(VALUES(activity_level), activity_level),
          diet_style = COALESCE(VALUES(diet_style), diet_style),
          meals_per_day = COALESCE(VALUES(meals_per_day), meals_per_day),
          allergies = COALESCE(VALUES(allergies), allergies),
          health_conditions = COALESCE(VALUES(health_conditions), health_conditions),
          target_date = COALESCE(VALUES(target_date), target_date),
          notes = COALESCE(VALUES(notes), notes),
          completed = COALESCE(VALUES(completed), completed)`,
        [
          userId,
          dp.personName || null, dp.age || null, dp.gender || null,
          dp.heightCm || null, dp.currentWeightKg || null, dp.targetWeightKg || null,
          dp.goal || null, dp.activityLevel || null, dp.dietStyle || null,
          dp.mealsPerDay || null, dp.allergies || null, dp.healthConditions || null,
          dp.targetDate || null, dp.notes || null, dp.completed === undefined ? null : (dp.completed ? 1 : 0)
        ]
      );
    }

    // 3. Update user_preferences table if preferences are present
    if (payload.preferences) {
      const prefs = payload.preferences;
      await pool.execute(
        `INSERT INTO user_preferences (
          user_id,
          daily_reminders,
          risk_alerts,
          weekly_summary,
          private_mode,
          hourly_reminders,
          app_notifications,
          email_notifications,
          remind_mood,
          remind_food,
          remind_water
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          daily_reminders = COALESCE(VALUES(daily_reminders), daily_reminders),
          risk_alerts = COALESCE(VALUES(risk_alerts), risk_alerts),
          weekly_summary = COALESCE(VALUES(weekly_summary), weekly_summary),
          private_mode = COALESCE(VALUES(private_mode), private_mode),
          hourly_reminders = COALESCE(VALUES(hourly_reminders), hourly_reminders),
          app_notifications = COALESCE(VALUES(app_notifications), app_notifications),
          email_notifications = COALESCE(VALUES(email_notifications), email_notifications),
          remind_mood = COALESCE(VALUES(remind_mood), remind_mood),
          remind_food = COALESCE(VALUES(remind_food), remind_food),
          remind_water = COALESCE(VALUES(remind_water), remind_water)`,
        [
          userId,
          prefs.dailyReminders === undefined ? null : (prefs.dailyReminders ? 1 : 0),
          prefs.riskAlerts === undefined ? null : (prefs.riskAlerts ? 1 : 0),
          prefs.weeklySummary === undefined ? null : (prefs.weeklySummary ? 1 : 0),
          prefs.privateMode === undefined ? null : (prefs.privateMode ? 1 : 0),
          prefs.hourlyReminders === undefined ? null : (prefs.hourlyReminders ? 1 : 0),
          prefs.appNotifications === undefined ? null : (prefs.appNotifications ? 1 : 0),
          prefs.emailNotifications === undefined ? null : (prefs.emailNotifications ? 1 : 0),
          prefs.remindMood === undefined ? null : (prefs.remindMood ? 1 : 0),
          prefs.remindFood === undefined ? null : (prefs.remindFood ? 1 : 0),
          prefs.remindWater === undefined ? null : (prefs.remindWater ? 1 : 0)
        ]
      );
    }

    const account = await getFullUser(userId);
    res.json({ ok: true, account });
  } catch (error) { 
    console.error("PUT /accounts/:id error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email or username is already used by another account." });
    }
    res.status(500).json({ message: error.message }); 
  }
});

// Wearable Data
app.post("/accounts/:id/wearable", async (req, res) => {
  const userId = req.params.id;
  const {
    wearableDate,
    device,
    steps,
    heartRate,
    activeMinutes,
    recoveryScore,
    source,
    appleHealthActive,
    iphoneActive,
    exportActive,
    bluetoothActive,
    sleepDuration,
    caloriesBurned
  } = req.body;
  const targetDate = wearableDate || new Date().toISOString().slice(0, 10);

  // Map undefined and empty strings to null or correct types for strict SQL safety
  const cleanDevice = (device !== undefined && device !== "") ? device : null;
  const cleanSteps = (steps !== undefined && steps !== "") ? parseInt(steps, 10) : null;
  const cleanHeartRate = (heartRate !== undefined && heartRate !== "") ? parseInt(heartRate, 10) : null;
  const cleanActiveMinutes = (activeMinutes !== undefined && activeMinutes !== "") ? parseInt(activeMinutes, 10) : null;
  const cleanRecoveryScore = (recoveryScore !== undefined && recoveryScore !== "") ? parseInt(recoveryScore, 10) : null;
  const cleanSource = (source !== undefined && source !== "") ? source : null;
  const cleanAppleHealthActive = appleHealthActive === undefined ? 0 : (appleHealthActive ? 1 : 0);
  const cleanIphoneActive = iphoneActive === undefined ? 0 : (iphoneActive ? 1 : 0);
  const cleanExportActive = exportActive === undefined ? 0 : (exportActive ? 1 : 0);
  const cleanBluetoothActive = bluetoothActive === undefined ? 0 : (bluetoothActive ? 1 : 0);
  const cleanSleepDuration = (sleepDuration !== undefined && sleepDuration !== "") ? parseFloat(sleepDuration) : null;
  const cleanCaloriesBurned = (caloriesBurned !== undefined && caloriesBurned !== "") ? parseFloat(caloriesBurned) : null;

  try {
    await pool.execute(
      `INSERT INTO wearable_data 
        (userID, date, device, steps, heartRate, activityMinutes, recovery_score, source, apple_health_active, iphone_active, export_active, bluetooth_active, sleepDuration, caloriesBurned) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        device = VALUES(device), steps = VALUES(steps), heartRate = VALUES(heartRate), 
        activityMinutes = VALUES(activityMinutes), recovery_score = VALUES(recovery_score), source = VALUES(source), 
        apple_health_active = VALUES(apple_health_active), iphone_active = VALUES(iphone_active), 
        export_active = VALUES(export_active), bluetooth_active = VALUES(bluetooth_active),
        sleepDuration = VALUES(sleepDuration), caloriesBurned = VALUES(caloriesBurned), 
        saved_at = CURRENT_TIMESTAMP`,
      [
        userId,
        targetDate,
        cleanDevice,
        cleanSteps,
        cleanHeartRate,
        cleanActiveMinutes,
        cleanRecoveryScore,
        cleanSource,
        cleanAppleHealthActive,
        cleanIphoneActive,
        cleanExportActive,
        cleanBluetoothActive,
        cleanSleepDuration,
        cleanCaloriesBurned
      ]
    );

    const account = await getFullUser(userId);
    res.json({ ok: true, account });
  } catch (error) { 
    console.error("Wearable Save Error:", error);
    res.status(500).json({ message: error.message }); 
  }
});

// Daily Check-In
app.post("/accounts/:id/daily-checkin", async (req, res) => {
  const userId = req.params.id;
  const { checkInDate, calories, protein, water, sleep, mood, stress, cravings, notes } = req.body;
  const targetDate = checkInDate || new Date().toISOString().slice(0, 10);

  const cleanInt = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
  };
  const cleanFloat = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : null;
  };

  // Map undefined, empty strings, and invalid numbers to null for strict SQL safety.
  const cleanCalories = cleanInt(calories);
  const cleanProtein = cleanInt(protein);
  const cleanWater = cleanFloat(water);
  const cleanSleep = cleanFloat(sleep);
  const cleanMood = cleanInt(mood);
  const cleanStress = cleanInt(stress);
  const cleanCravings = cleanInt(cravings);
  const cleanNotes = (notes !== undefined && notes !== "") ? notes : null;

  try {
    await pool.execute(
      `INSERT INTO daily_checkins 
        (user_id, check_in_date, calories, protein, water, sleep, mood, stress, cravings, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        calories = VALUES(calories), protein = VALUES(protein), water = VALUES(water), 
        sleep = VALUES(sleep), mood = VALUES(mood), stress = VALUES(stress), 
        cravings = VALUES(cravings), notes = VALUES(notes), saved_at = CURRENT_TIMESTAMP`,
      [userId, targetDate, cleanCalories, cleanProtein, cleanWater, cleanSleep, cleanMood, cleanStress, cleanCravings, cleanNotes]
    );

    try {
      // Also save/update MoodLog table to keep in sync.
      if (cleanMood !== null || cleanStress !== null || cleanCravings !== null || cleanSleep !== null) {
        const [existingMoodLogs] = await pool.execute(
          "SELECT moodLogiD FROM MoodLog WHERE userID = ? AND date = ?",
          [userId, targetDate]
        );

        if (existingMoodLogs.length > 0) {
          await pool.execute(
            `UPDATE MoodLog SET 
              moodLevel = ?, stressLevel = ?, cravingLevel = ?, sleepHours = ?
             WHERE userID = ? AND date = ?`,
            [cleanMood, cleanStress, cleanCravings, cleanSleep, userId, targetDate]
          );
        } else {
          await pool.execute(
            `INSERT INTO MoodLog 
              (userID, date, moodLevel, stressLevel, cravingLevel, sleepHours, motivationLevel, consistencyStatus) 
             VALUES (?, ?, ?, ?, ?, ?, 5, 'tracked')`,
            [userId, targetDate, cleanMood, cleanStress, cleanCravings, cleanSleep]
          );
        }
      }
    } catch (syncError) {
      console.warn("Daily Check-in MoodLog sync skipped:", syncError.message);
    }

    const riskResult = await saveFailureRiskResult(userId, targetDate, {
      calories: cleanCalories,
      protein: cleanProtein,
      water: cleanWater,
      sleep: cleanSleep,
      mood: cleanMood,
      stress: cleanStress,
      cravings: cleanCravings
    });

    const [preferences] = await pool.execute(
      "SELECT risk_alerts FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    if (riskResult && preferences[0]?.risk_alerts && riskResult.riskScore >= 45) {
      const [existingRiskNotifications] = await pool.execute(
        "SELECT id FROM notification_log WHERE user_id = ? AND type = ? AND DATE(created_at) = ? LIMIT 1",
        [userId, "risk", targetDate]
      );

      if (existingRiskNotifications.length === 0) {
        await createNotification(userId, {
          title: `${riskResult.riskLevel} detected`,
          message: riskResult.riskMessage,
          type: "risk"
        });
      }
    }

    const account = await getFullUser(userId);
    res.json({ ok: true, account });
  } catch (error) { 
    console.error("Daily Check-in Error:", error);
    res.status(500).json({ message: error.message }); 
  }
});

app.delete("/accounts/:id/daily-checkin/:date", async (req, res) => {
  const userId = req.params.id;
  const targetDate = req.params.date;

  try {
    await pool.execute(
      "DELETE FROM daily_checkins WHERE user_id = ? AND check_in_date = ?",
      [userId, targetDate]
    );

    await pool.execute(
      "DELETE FROM MoodLog WHERE userID = ? AND date = ?",
      [userId, targetDate]
    );

    await pool.execute(
      "DELETE FROM failure_risk_results WHERE user_id = ? AND check_in_date = ?",
      [userId, targetDate]
    );

    const account = await getFullUser(userId);
    res.json({ ok: true, account });
  } catch (error) {
    console.error("Daily Check-in Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/accounts/:id/failure-risk/:riskId", async (req, res) => {
  try {
    await pool.execute(
      "DELETE FROM failure_risk_results WHERE user_id = ? AND id = ?",
      [req.params.id, req.params.riskId]
    );

    const account = await getFullUser(req.params.id);
    res.json({ ok: true, account });
  } catch (error) {
    console.error("Failure Risk Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/accounts/:id/failure-risk", async (req, res) => {
  const userId = req.params.id;
  const {
    checkInDate,
    riskScore,
    riskLevel,
    riskMessage,
    reasons = [],
    insights = [],
    metrics = {}
  } = req.body;
  const targetDate = checkInDate || new Date().toISOString().slice(0, 10);

  try {
    const [existing] = await pool.execute(
      `SELECT id FROM failure_risk_results
       WHERE user_id = ? AND check_in_date = ? AND risk_score = ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId, targetDate, Number(riskScore) || 0]
    );

    if (existing.length === 0) {
      await pool.execute(
        `INSERT INTO failure_risk_results
          (user_id, check_in_date, risk_score, risk_level, risk_message, reasons, insights, metrics)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          targetDate,
          Number(riskScore) || 0,
          riskLevel || "No Risk Data",
          riskMessage || "",
          JSON.stringify(reasons),
          JSON.stringify(insights),
          JSON.stringify(metrics)
        ]
      );
    }

    const account = await getFullUser(userId);
    res.status(201).json({ ok: true, account });
  } catch (error) {
    console.error("Failure Risk Save Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Feedback
app.post("/accounts/:id/feedback", async (req, res) => {
  const userId = req.params.id;
  const payload = req.body;

  try {
    await pool.execute(
      "INSERT INTO feedback (id, user_id, author, title, type, rating, message) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [Date.now(), userId, payload.author, payload.title, payload.type, payload.rating, payload.message]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete feedback (Admin)
app.delete("/admin/feedback/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM feedback WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all feedback
app.get("/feedback", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM feedback ORDER BY created_at DESC");
    res.json({ feedback: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all diet profiles (Admin)
app.get("/admin/diet-profiles", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM diet_profiles ORDER BY updated_at DESC");
    res.json({ dietProfiles: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all daily check-ins (Admin)
app.get("/admin/daily-checkins", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        id,
        user_id,
        DATE_FORMAT(check_in_date, '%Y-%m-%d') AS check_in_date,
        calories,
        protein,
        water,
        sleep,
        mood,
        stress,
        cravings,
        notes,
        DATE_FORMAT(saved_at, '%Y-%m-%d %H:%i:%s') AS saved_at
      FROM daily_checkins
      ORDER BY check_in_date DESC, saved_at DESC
    `);
    res.json({ checkins: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update daily check-in (Admin)
app.put("/admin/daily-checkins/:id", async (req, res) => {
  const { calories, protein, water, sleep, mood, stress, cravings, notes } = req.body;
  try {
    await pool.execute(
      `UPDATE daily_checkins SET 
        calories = ?, protein = ?, water = ?, sleep = ?, 
        mood = ?, stress = ?, cravings = ?, notes = ? 
      WHERE id = ?`,
      [calories, protein, water, sleep, mood, stress, cravings, notes, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete daily check-in (Admin)
app.delete("/admin/daily-checkins/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM daily_checkins WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all wearable data (Admin)
app.get("/admin/wearable-data", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        *, 
        DATE_FORMAT(date, '%Y-%m-%d') as wearable_date, 
        wearablelD as id, 
        userID as user_id, 
        heartRate as heart_rate, 
        activityMinutes as active_minutes 
      FROM wearable_data 
      ORDER BY date DESC, saved_at DESC`
    );
    res.json({ wearables: rows });
  } catch (error) {
    console.error("GET /admin/wearable-data error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update wearable data (Admin)
app.put("/admin/wearable-data/:id", async (req, res) => {
  const { device, steps, heart_rate, active_minutes, recovery_score, source } = req.body;
  try {
    await pool.execute(
      `UPDATE wearable_data SET 
        device = ?, steps = ?, heartRate = ?, 
        activityMinutes = ?, recovery_score = ?, source = ? 
      WHERE wearablelD = ?`,
      [
        device || null, 
        steps === undefined || steps === "" ? null : parseInt(steps, 10), 
        heart_rate === undefined || heart_rate === "" ? null : parseInt(heart_rate, 10), 
        active_minutes === undefined || active_minutes === "" ? null : parseInt(active_minutes, 10), 
        recovery_score === undefined || recovery_score === "" ? null : parseInt(recovery_score, 10), 
        source || null, 
        req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("PUT /admin/wearable-data/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Delete wearable data (Admin)
app.delete("/admin/wearable-data/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM wearable_data WHERE wearablelD = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /admin/wearable-data/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all notifications (Admin)
app.get("/admin/notifications", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 100");
    res.json({ notifications: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Broadcast notification to all users (Admin)
app.post("/admin/notifications/broadcast", async (req, res) => {
  const { title, message, type, emailNotify } = req.body;
  try {
    const [users] = await pool.execute("SELECT userID AS id, email FROM users WHERE role != 'admin'");

    const results = await Promise.all(
      users.map((user) =>
        createNotificationAndMaybeEmail(user, {
          title,
          message,
          type: type || "system",
          emailNotify
        })
      )
    );

    const emailRequested = shouldSendEmail(emailNotify);
    const emailSent = results.filter((result) => result.emailSent).length;
    const emailFailed = emailRequested
      ? results.filter((result) => result.recipient.email && !result.emailSent).length
      : 0;
    const withoutEmail = emailRequested
      ? results.filter((result) => !result.recipient.email).length
      : 0;

    res.json({
      ok: true,
      sentTo: users.length,
      savedToDatabase: results.length,
      email: {
        requested: emailRequested,
        sent: emailSent,
        failed: emailFailed,
        withoutEmail
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notifications as read
app.put("/accounts/:id/notifications/read", async (req, res) => {
  try {
    await pool.execute(
      "UPDATE notification_log SET read_status = 1 WHERE user_id = ?",
      [req.params.id]
    );
    const account = await getFullUser(req.params.id);
    res.json({ ok: true, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send single notification
app.post("/accounts/:id/notifications", async (req, res) => {
  const { title, message, type, emailNotify } = req.body;
  try {
    const [users] = await pool.execute(
      "SELECT userID AS id, email FROM users WHERE userID = ? LIMIT 1",
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Recipient account was not found." });
    }

    const result = await createNotificationAndMaybeEmail(users[0], {
      title,
      message,
      type: type || "alert",
      emailNotify
    });
    const account = await getFullUser(req.params.id);
    res.status(201).json({
      ok: true,
      notification: result.notification,
      account,
      email: {
        requested: result.emailRequested,
        sent: result.emailSent,
        failed: result.emailRequested && !!result.recipient.email && !result.emailSent,
        withoutEmail: result.emailRequested && !result.recipient.email
      }
    });
  } catch (error) {
    const status = error.message.includes("required") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
});

function buildAiDietInstructions(accountContext = {}) {
  return [
    "You are Reality Engine X's real AI Diet Assistant.",
    "Answer the user's diet, food, calorie, protein, BMR, weight goal, health habit, and meal-planning questions.",
    "Use the provided user context when available: diet profile, latest daily check-in, wearable data, BMR targets, and goals.",
    "Be practical, specific, and explain calculations clearly.",
    "Do not diagnose disease or replace a doctor. For medical symptoms, medication, eating disorders, pregnancy, diabetes, heart disease, kidney disease, or severe restriction, tell the user to consult a qualified clinician.",
    "If data is missing, say what data is missing and how it affects the answer.",
    "Prefer concise answers with numbers, next steps, and safe assumptions.",
    `User context JSON: ${JSON.stringify(accountContext)}`
  ].join("\n");
}

function extractOpenAiText(data) {
  if (data.output_text) return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

const FREE_MODELS = [
  "openrouter/auto:free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

async function createAiDietReply({ message, messages = [], accountContext = {} }) {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  console.log("--- AI REQUEST START ---");

  if (!apiKey) {
    console.error("CRITICAL: OPENROUTER_API_KEY is missing or empty in .env");
    throw new Error("OpenRouter API key is missing.");
  }

  const recentConversation = (messages || [])
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.text
    }));

  const systemPrompt = buildAiDietInstructions(accountContext);

  // Try models in sequence until one works
  const modelsToTry = process.env.AI_MODEL ? [process.env.AI_MODEL, ...FREE_MODELS] : FREE_MODELS;
  let lastError = "AI request failed";

  console.log(`Fallback strategy: Trying up to ${modelsToTry.length} models.`);

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Attempting] Model: ${modelName}`);
      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            ...recentConversation,
            { role: "user", content: message }
          ]
        })
      });

      const data = await aiResponse.json();

      if (aiResponse.ok) {
        console.log(`[Success] Model: ${modelName}`);
        return data.choices?.[0]?.message?.content || "I could not generate an answer.";
      }

      lastError = data.error?.message || "AI request failed";
      console.warn(`[Failed] Model ${modelName}:`, lastError);
    } catch (error) {
      lastError = error.message;
      console.error(`[Error] Model ${modelName}:`, lastError);
    }
  }

  console.error("--- ALL AI MODELS FAILED ---");
  throw new Error(`AI Provider Error: ${lastError}. Please check your internet or API key.`);
}

async function createAiPredictions(accountContext = {}) {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("OpenRouter API key is missing.");
  }

  const systemPrompt = `You are Reality Engine X's AI Analyst. 
Analyze the provided user data (diet profile, check-ins, wearables) and generate 3-5 specific, data-driven predictions or insights.
Return the response ONLY as a JSON array of objects with this structure:
[
  {
    "title": "Short Title",
    "level": "High/Medium/Low/Positive/Stable",
    "probability": 0-100,
    "description": "Insightful explanation based on their data."
  }
]
Be realistic and helpful. Use the user's name if available.
User Data: ${JSON.stringify(accountContext)}`;

  const modelsToTry = process.env.AI_MODEL ? [process.env.AI_MODEL, ...FREE_MODELS] : FREE_MODELS;
  let lastError = "AI predictions failed";

  for (const modelName of modelsToTry) {
    try {
      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate my health and diet predictions based on my data." }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await aiResponse.json();

      if (aiResponse.ok) {
        let content = data.choices?.[0]?.message?.content || "[]";
        try {
          if (content.includes("```json")) {
            content = content.split("```json")[1].split("```")[0];
          } else if (content.includes("```")) {
            content = content.split("```")[1].split("```")[0];
          }
          return JSON.parse(content);
        } catch (e) {
          console.error(`Failed to parse AI predictions from ${modelName}:`, content);
          continue; // Try next model if parsing fails
        }
      }

      lastError = data.error?.message || "AI predictions failed";
    } catch (error) {
      lastError = error.message;
    }
  }

  return []; // Return empty array if all models fail
}

// AI Predictions
app.post("/ai/predictions", async (req, res) => {
  const userId = req.body.userID || req.body.accountContext?.id;
  try {
    const predictions = await createAiPredictions(req.body.accountContext);

    let predictionArray = [];
    if (predictions) {
      if (Array.isArray(predictions)) {
        predictionArray = predictions;
      } else if (typeof predictions === "object") {
        predictionArray = [predictions];
      }
    }

    // Persist to database if userId exists
    if (userId && predictionArray.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      for (const p of predictionArray) {
        if (!p || !p.title) continue;
        try {
          const [predictionResult] = await pool.execute(
            "INSERT INTO PredictionResult (userID, date, riskLevel, successProbability, predictionStatus, reason) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, today, p.level || 'Low', (p.probability !== undefined ? p.probability : 50) / 100, p.title, p.description || '']
          );

          const recommendationText = buildRecommendationText(p);
          await pool.execute(
            "INSERT INTO Recommendations (userID, predictionID, recommendationText, recommendationType, date) VALUES (?, ?, ?, ?, ?)",
            [userId, predictionResult.insertId || null, recommendationText, p.title || "AI recommendation", today]
          );
        } catch (dbErr) {
          console.error("Failed to save prediction to DB:", dbErr);
        }
      }
    }

    res.json({ ok: true, predictions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function buildRecommendationText(prediction) {
  const title = String(prediction?.title || "").toLowerCase();
  const level = String(prediction?.level || "").toLowerCase();

  if (title.includes("failure") || level === "high") {
    return "Reduce today's risk: plan the next meal, prioritize protein, drink water, and lower stress before cravings build.";
  }

  if (title.includes("recovery") || title.includes("sleep")) {
    return "Support recovery tonight with a consistent sleep window, lower late caffeine, and a lighter evening routine.";
  }

  if (title.includes("nutrition") || title.includes("protein")) {
    return "Complete your nutrition targets by logging each meal and adding a protein source if your intake is below goal.";
  }

  if (title.includes("activity") || title.includes("wearable")) {
    return "Use your activity signal: add a short walk or light movement block if steps or active minutes are low.";
  }

  return prediction?.description || "Review this insight and update your next check-in after applying one concrete action.";
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" && value !== null ? number : null;
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

function pickNumber(...values) {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) return number;
  }

  return null;
}

function normalizeGoal(goal, currentWeight, targetWeight) {
  const text = String(goal || "").trim().toLowerCase();

  if (text.includes("fat loss") || text.includes("lose") || text.includes("loss") || text.includes("cut")) {
    return "Fat loss";
  }

  if (text.includes("lean bulk") || text.includes("bulk") || text.includes("muscle") || text.includes("gain")) {
    return "Muscle gain";
  }

  if (text.includes("health")) return "Health improvement";
  if (text.includes("maintain")) return "Maintenance";
  if (currentWeight && targetWeight) return targetWeight < currentWeight ? "Fat loss" : "Muscle gain";

  return "Maintenance";
}

function calculateNutritionPlanForRisk(user = {}, profile = {}) {
  const activityMultipliers = {
    Low: 1.25,
    Moderate: 1.45,
    High: 1.65,
    Athlete: 1.85
  };
  const weight = pickNumber(profile.current_weight_kg, user.currentWeight, user.weightKg);
  const targetWeight = pickNumber(profile.target_weight_kg, user.targetWeight, user.targetWeightKg);
  const height = pickNumber(profile.height_cm, user.height, user.heightCm);
  const age = pickNumber(profile.age, user.age);
  const gender = String(profile.gender || user.gender || "Male").toLowerCase();
  const activityLevel = profile.activity_level || user.activityLevel || "Moderate";
  const goal = normalizeGoal(profile.goal || user.healthGoal || user.goal, weight, targetWeight);

  if (!weight || !height || !age) {
    return {
      goal,
      calorieTarget: 0,
      proteinTarget: 0
    };
  }

  const bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  const activityMultiplier = activityMultipliers[activityLevel] || activityMultipliers.Moderate;
  const maintenance = Math.round(bmr * activityMultiplier);
  const weightDelta = targetWeight ? targetWeight - weight : 0;
  const changePercent = weight ? Math.abs(weightDelta) / weight : 0;
  const goalAdjustment = goal === "Fat loss"
    ? -Math.round(clamp(maintenance * (changePercent >= 0.1 ? 0.2 : 0.15), 300, 650))
    : goal === "Muscle gain"
      ? Math.round(clamp(maintenance * (changePercent >= 0.08 ? 0.12 : 0.08), 200, 350))
      : goal === "Health improvement"
        ? weightDelta < -1 ? -250 : weightDelta > 1 ? 150 : 0
        : 0;
  const minimumCalories = gender === "female" ? 1200 : 1500;
  const rawTarget = Math.round(maintenance + goalAdjustment);
  const calorieTarget = goal === "Fat loss"
    ? Math.max(Math.max(minimumCalories, Math.round(bmr * 0.75)), Math.min(maintenance - 1, rawTarget))
    : Math.max(minimumCalories, rawTarget);
  const proteinMultiplier = goal === "Fat loss" ? 2 : goal === "Muscle gain" ? 1.8 : 1.6;

  return {
    goal,
    calorieTarget,
    proteinTarget: Math.round(weight * proteinMultiplier)
  };
}

function calculateCalorieRisk(goal, calories, target) {
  if (!calories || !target) return 22;

  const ratio = calories / target;
  const overRatio = Math.max(0, ratio - 1);
  const underRatio = Math.max(0, 1 - ratio);
  const absoluteGap = Math.abs(ratio - 1);

  if (goal === "Fat loss") {
    if (overRatio > 0) return overRatio >= 0.35 ? 42 : overRatio >= 0.2 ? 32 : overRatio >= 0.1 ? 18 : 8;
    return underRatio >= 0.35 ? 20 : underRatio >= 0.25 ? 14 : underRatio >= 0.15 ? 8 : 2;
  }

  if (goal === "Muscle gain" || goal === "Lean bulk") {
    if (underRatio > 0) return underRatio >= 0.25 ? 34 : underRatio >= 0.15 ? 24 : underRatio >= 0.08 ? 14 : 3;
    return overRatio >= 0.3 ? 20 : overRatio >= 0.2 ? 13 : overRatio >= 0.1 ? 7 : 3;
  }

  return absoluteGap >= 0.3 ? 24 : absoluteGap >= 0.2 ? 16 : absoluteGap >= 0.1 ? 8 : 2;
}

function getFailureRiskLevel(score) {
  if (score >= 75) {
    return {
      label: "High Risk",
      message: "Nutrition and lifestyle signals show strong pressure against the diet plan."
    };
  }

  if (score >= 45) {
    return {
      label: "Medium Risk",
      message: "There are warning signs, but the plan is still recoverable."
    };
  }

  return {
    label: "Low Risk",
    message: "Your current nutrition and lifestyle pattern supports your diet goal."
  };
}

async function saveFailureRiskResult(userId, targetDate, checkInValues) {
  const [users] = await pool.execute("SELECT * FROM users WHERE userID = ?", [userId]);
  const [profiles] = await pool.execute("SELECT * FROM diet_profiles WHERE user_id = ?", [userId]);
  const user = users[0] || {};
  const profile = profiles[0] || {};
  const plan = calculateNutritionPlanForRisk(user, profile);
  const waterTarget = pickNumber(profile.current_weight_kg, user.currentWeight)
    ? Math.round(clamp(pickNumber(profile.current_weight_kg, user.currentWeight) * 0.035, 2, 4.5) * 10) / 10
    : 3;

  const metrics = {
    calories: Number(checkInValues.calories) || 0,
    calorieTarget: plan.calorieTarget,
    protein: Number(checkInValues.protein) || 0,
    proteinTarget: plan.proteinTarget,
    water: Number(checkInValues.water) || 0,
    waterTarget,
    sleep: Number(checkInValues.sleep) || 0,
    mood: Number(checkInValues.mood) || 0,
    stress: Number(checkInValues.stress) || 0,
    cravings: Number(checkInValues.cravings) || 0,
    goal: plan.goal
  };

  const proteinGap = metrics.protein && metrics.proteinTarget
    ? Math.max(0, metrics.proteinTarget - metrics.protein) / metrics.proteinTarget
    : 1;
  const waterGap = metrics.water && waterTarget
    ? Math.max(0, waterTarget - metrics.water) / waterTarget
    : 1;
  const risk =
    calculateCalorieRisk(plan.goal, metrics.calories, plan.calorieTarget) +
    (proteinGap >= 0.5 ? 16 : proteinGap >= 0.25 ? 10 : proteinGap > 0 ? 6 : 2) +
    (!metrics.water ? 10 : waterGap >= 0.5 ? 14 : waterGap >= 0.25 ? 9 : waterGap > 0.1 ? 5 : 2) +
    (metrics.calories > 0 && metrics.protein > 0 ? 0 : 14) +
    (metrics.sleep < 5 ? 20 : metrics.sleep < 6 ? 15 : metrics.sleep < 7 ? 8 : 3) +
    (metrics.stress >= 8 ? 18 : metrics.stress >= 7 ? 14 : metrics.stress >= 5 ? 8 : 3) +
    (metrics.cravings >= 8 ? 18 : metrics.cravings >= 7 ? 14 : metrics.cravings >= 5 ? 8 : 3) +
    (metrics.mood <= 3 ? 12 : metrics.mood <= 5 ? 8 : 3);
  const riskScore = Math.min(100, Math.round(risk));
  const level = getFailureRiskLevel(riskScore);
  const reasons = buildFailureReasons(metrics);
  const insights = buildFailureInsights(metrics);
  const payload = [
    riskScore,
    level.label,
    level.message,
    JSON.stringify(reasons),
    JSON.stringify(insights),
    JSON.stringify(metrics),
    userId,
    targetDate
  ];

  const [existing] = await pool.execute(
    `SELECT id FROM failure_risk_results
     WHERE user_id = ? AND check_in_date = ?
     ORDER BY created_at DESC`,
    [userId, targetDate]
  );

  if (existing.length > 0) {
    await pool.execute(
      `UPDATE failure_risk_results
       SET risk_score = ?,
           risk_level = ?,
           risk_message = ?,
           reasons = ?,
           insights = ?,
           metrics = ?,
           created_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND check_in_date = ?`,
      payload
    );

    if (existing.length > 1) {
      await pool.execute(
        `DELETE FROM failure_risk_results
         WHERE user_id = ? AND check_in_date = ? AND id <> ?`,
        [userId, targetDate, existing[0].id]
      );
    }
  } else {
    await pool.execute(
      `INSERT INTO failure_risk_results
        (user_id, check_in_date, risk_score, risk_level, risk_message, reasons, insights, metrics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        targetDate,
        riskScore,
        level.label,
        level.message,
        JSON.stringify(reasons),
        JSON.stringify(insights),
        JSON.stringify(metrics)
      ]
    );
  }

  return {
    riskScore,
    riskLevel: level.label,
    riskMessage: level.message,
    reasons,
    insights,
    metrics
  };
}

function buildFailureReasons(metrics) {
  const reasons = [];

  if (!metrics.calories) reasons.push("Calories are missing, so diet success cannot be judged clearly.");
  if (!metrics.protein) reasons.push("Protein is missing, so the nutrition plan is incomplete.");
  if (!metrics.water) reasons.push("Water is missing, so hydration risk cannot be judged clearly.");
  if (metrics.protein && metrics.proteinTarget && metrics.protein < metrics.proteinTarget * 0.75) reasons.push("Protein is too low for the current diet target.");
  if (metrics.water && metrics.waterTarget && metrics.water < metrics.waterTarget * 0.75) reasons.push("Water intake is low enough to increase hunger, fatigue, and cravings.");
  if (metrics.sleep < 6) reasons.push("Sleep is below the recovery target.");
  if (metrics.mood <= 5) reasons.push("Mood is low enough to affect consistency.");
  if (metrics.cravings >= 7) reasons.push("Cravings are currently elevated.");
  if (metrics.stress >= 7) reasons.push("Stress is high enough to affect discipline and hunger.");
  if (!reasons.length) reasons.push("No major risk drivers detected from your latest check-in.");

  return reasons;
}

function buildFailureInsights(metrics) {
  return [
    {
      label: "Calories vs diet target",
      value: metrics.calorieTarget ? `${metrics.calories} / ${metrics.calorieTarget}` : `${metrics.calories || 0}`,
      impact: metrics.calories && metrics.calorieTarget ? "Input" : "High"
    },
    {
      label: "Protein vs diet target",
      value: metrics.proteinTarget ? `${metrics.protein}g / ${metrics.proteinTarget}g` : `${metrics.protein || 0}g`,
      impact: metrics.protein && metrics.proteinTarget && metrics.protein >= metrics.proteinTarget * 0.75 ? "Medium" : "High"
    },
    {
      label: "Water vs hydration target",
      value: `${metrics.water || 0}L / ${metrics.waterTarget}L`,
      impact: metrics.water >= metrics.waterTarget * 0.75 ? "Medium" : "High"
    },
    {
      label: "Stress pressure",
      value: `${metrics.stress}/10`,
      impact: metrics.stress >= 7 ? "High" : "Input"
    }
  ];
}

// AI Chat
app.post("/ai/diet-chat", async (req, res) => {
  const payload = req.body;
  const message = String(payload.message || "").trim();

  if (!message) {
    return res.status(400).json({
      ok: false,
      message: "Message is required."
    });
  }

  try {
    const reply = await createAiDietReply({
      message,
      messages: payload.messages,
      accountContext: payload.accountContext
    });

    res.json({
      ok: true,
      reply,
      model: process.env.AI_MODEL || "mistralai/mistral-7b-instruct:free"
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Reality Engine X API (MySQL) running on http://localhost:${PORT}`);
});
