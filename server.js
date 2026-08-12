require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { createOrderStore, validateOrder: validateOrderData } = require("./order-store");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const PRICE = 50;
const SERVICE_AREA = "Palamaner";
const ADMIN_COOKIE = "sa_admin";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn("WARNING: MONGODB_URI, JWT_SECRET and ADMIN_PASSWORD must be configured.");
}

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many login attempts. Try again later." }
});

let db;
let orders;
let useMemoryStore = false;
const memoryOrders = createOrderStore();

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    useMemoryStore = true;
    orders = memoryOrders;
    console.log("No MONGODB_URI found. Using in-memory order storage for local development.");
    return;
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    db = client.db(process.env.MONGODB_DB || "sa_dairy_farm");
    orders = db.collection("orders");
    await orders.createIndex({ createdAt: -1 });
    await orders.createIndex({ deliveryDate: 1 });
    useMemoryStore = false;
    console.log("MongoDB connected.");
  } catch (error) {
    console.warn("MongoDB connection failed, falling back to in-memory storage:", error.message);
    orders = memoryOrders;
    useMemoryStore = true;
  }
}

function adminOnly(req, res, next) {
  const token = req.cookies[ADMIN_COOKIE];
  if (!token) return res.status(401).json({ success: false, message: "Admin login required." });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie(ADMIN_COOKIE);
    return res.status(401).json({ success: false, message: "Admin session expired." });
  }
}

function validateOrder(body) {
  return validateOrderData(body);
}

app.get("/api/health", async (req,res) => {
  res.json({ success:true, service:"SA Dairy Farm", pricePerLitre:PRICE, serviceArea:SERVICE_AREA, database: useMemoryStore ? "memory" : "mongodb" });
});

app.post("/api/orders", async (req,res) => {
  try {
    const validation = validateOrder(req.body);
    if (validation) return res.status(400).json({success:false,message:validation});

    let order;
    if (useMemoryStore) {
      order = memoryOrders.create(req.body);
    } else {
      const quantity = Number(req.body.quantity);
      const timestamp = Date.now().toString();
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      order = {
        id: `${timestamp}${randomPart}`,
        name: req.body.name.trim(),
        phone: String(req.body.phone),
        quantity,
        pricePerLitre: PRICE,
        totalAmount: quantity * PRICE,
        deliveryDate: req.body.deliveryDate,
        address: req.body.address.trim(),
        notes: String(req.body.notes || "").trim(),
        status: "Pending",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await orders.insertOne(order);
    }

    res.status(201).json({success:true,order});
  } catch (e) {
    console.error(e);
    res.status(500).json({success:false,message:"Unable to save order."});
  }
});

app.post("/api/admin/login", loginLimiter, async (req,res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "";
  const valid = username === expectedUser && password === expectedPass;
  if (!valid) return res.status(401).json({success:false,message:"Invalid username or password."});

  const token = jwt.sign({ username: expectedUser, role:"admin" }, process.env.JWT_SECRET || "dev-secret", {expiresIn:"8h"});
  res.cookie(ADMIN_COOKIE, token, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:8*60*60*1000});
  res.json({success:true});
});

app.post("/api/admin/logout", (req,res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.json({success:true});
});

app.get("/api/admin/me", adminOnly, (req,res) => res.json({success:true,admin:req.admin.username}));

app.get("/api/admin/orders", adminOnly, async (req,res) => {
  try {
    if (useMemoryStore) {
      const list = memoryOrders.list();
      return res.json({success:true,count:list.length,orders:list});
    }
    const list = await orders.find({}).sort({createdAt:-1}).toArray();
    res.json({success:true,count:list.length,orders:list});
  } catch { res.status(500).json({success:false,message:"Unable to load orders."}); }
});

app.patch("/api/admin/orders/:id/status", adminOnly, async (req,res) => {
  const allowed = ["Pending","Confirmed","Delivered","Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({success:false,message:"Invalid status."});
  try {
    if (useMemoryStore) {
      const result = memoryOrders.updateStatus(req.params.id, req.body.status);
      if (!result) return res.status(404).json({success:false,message:"Order not found."});
      return res.json({success:true,order:result});
    }

    const result = await orders.findOneAndUpdate(
      { id:req.params.id },
      {$set:{status:req.body.status,updatedAt:new Date()}},
      {returnDocument:"after"}
    );
    if (!result) return res.status(404).json({success:false,message:"Order not found."});
    res.json({success:true,order:result});
  } catch { res.status(500).json({success:false,message:"Unable to update order."}); }
});

app.use(express.static(path.join(__dirname, "..")));

app.get("/admin", (req,res) => res.sendFile(path.join(__dirname,"admin.html")));

app.use((req,res,next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({success:false,message:"API route not found."});
  next();
});

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

connectDB()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`SA Dairy Farm running on port ${PORT}`)))
  .catch(err => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });
