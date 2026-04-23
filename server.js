require("dotenv").config();

const express = require("express");
const path = require("path");
const net = require("net");
const cors = require("cors");
const authRoutes = require("./src/routes/auth.routes");
const donorRoutes = require("./src/routes/donor.routes");
const patientRoutes = require("./src/routes/patient.routes");
const adminRoutes = require("./src/routes/admin.routes");
const metaRoutes = require("./src/routes/meta.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const chatRoutes = require("./src/routes/chat.routes");
const { attachUserIfPresent } = require("./src/middleware/auth.middleware");
const fileDb = require("./src/config/fileDb");

const app = express();
const PREFERRED_PORT = Number(process.env.PORT || 4500);

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const tester = net.createServer();

      tester.once("error", (error) => {
        tester.close();
        if (error.code === "EADDRINUSE") {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });

      tester.once("listening", () => {
        tester.close(() => resolve(port));
      });

      tester.listen(port);
    };

    tryPort(startPort);
  });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachUserIfPresent);

app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

(async () => {
  try {
    fileDb.initializeData();
    const port = await findAvailablePort(PREFERRED_PORT);
    app.listen(port, () => {
      console.log(`\nPulse-Link app running at http://localhost:${port}`);
      console.log("Data is stored in the local /data folder as JSON files.\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();
