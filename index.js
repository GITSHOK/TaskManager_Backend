const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();


const PORT = process.env.PORT_NO;
const mongo = process.env.MONGO_URI;
const UserSchema = require("./models/User.js");
const TaskSchema = require("./models/Task.js");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = "mysecretkey";


// 🔌 DB CONNECT
mongoose.connect(mongo)
  .then(() => console.log("✅ Database connected"))
  .catch(err => console.log(err));


// 🔐 AUTH MIDDLEWARE
const verifyUser = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.userId = decoded.id;
    next();
  });
};


// =======================
// ✅ REGISTER
// =======================
app.post('/register', async (req, res) => {
  try {
    await UserSchema.create(req.body);
    res.json({ message: "Success" });
  } catch (err) {
    res.status(500).json(err);
  }
});


// =======================
// ✅ LOGIN
// =======================
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserSchema.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Success", token });

  } catch (err) {
    res.status(500).json(err);
  }
});


// =======================
// ➕ ADD TASK
// =======================
app.post('/add-task', verifyUser, async (req, res) => {
  try {
    const task = await TaskSchema.create({
      userId: req.userId,   // ✅ KEEP AS STRING (Mongoose handles it)
      taskName: req.body.taskName,
      group: req.body.group,
      completed: false
    });

    console.log("➕ ADD TASK userId:", req.userId);

    res.json(task);

  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});


// =======================
// 📋 GET TASKS
// =======================
app.get('/get-tasks', verifyUser, async (req, res) => {
  try {
    console.log("📥 FETCH TASKS userId:", req.userId);

    const tasks = await TaskSchema.find({ userId: req.userId });

    console.log("📦 TASKS FOUND:", tasks);

    res.json(tasks);

  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});


// =======================
// 👤 GET USER
// =======================
app.get('/get-user', verifyUser, async (req, res) => {
  try {
    const user = await UserSchema.findById(req.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});


// =======================
// ✏️ UPDATE TASK
// =======================
app.put("/update-task/:id", verifyUser, async (req, res) => {
  try {
    const updatedTask = await TaskSchema.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedTask);

  } catch (error) {
    res.status(500).json(error);
  }
});


// =======================
// 📊 TASK STATS
// =======================
app.get("/taskstats", verifyUser, async (req, res) => {
  try {
    const userId = req.userId;

    // Basic counts
    const total = await TaskSchema.countDocuments({ userId });

    const completed = await TaskSchema.countDocuments({
      userId,
      completed: true
    });

    const pending = await TaskSchema.countDocuments({
      userId,
      completed: false
    });

    // =========================
    // 📈 TASKS PER DAY
    // =========================
    const tasksPerDayRaw = await TaskSchema.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            }
          },
          created: { $sum: 1 },
          completed: {
            $sum: {
              $cond: ["$completed", 1, 0]
            }
          }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    const tasksPerDay = tasksPerDayRaw.map(item => ({
      date: item._id.date,
      created: item.created,
      completed: item.completed
    }));

    // =========================
    // 📊 GROUP-WISE STATS
    // =========================
    const groupStatsRaw = await TaskSchema.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$group",
          completed: {
            $sum: {
              $cond: ["$completed", 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$completed", false] }, 1, 0]
            }
          }
        }
      }
    ]);

    const groupStats = groupStatsRaw.map(item => ({
      group: item._id || "Other",
      completed: item.completed,
      pending: item.pending
    }));

    // =========================
    // 📤 FINAL RESPONSE
    // =========================
    res.json({
      total,
      completed,
      pending,
      tasksPerDay,
      groupStats
    });

  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});


// =======================
// 🚀 START SERVER
// =======================
app.listen(PORT, () => {
  console.log("🚀 Server running on port 3001");
});