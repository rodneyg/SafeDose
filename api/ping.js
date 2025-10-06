// api/ping.js
module.exports = (req, res) => {
  console.log("✅ /api/ping");
  res.status(200).json({ message: "pong", status: "ok", timestamp: new Date().toISOString() });
};