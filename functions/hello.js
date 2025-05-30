"use strict";

// api/hello.js
module.exports = (req, res) => {
  console.log("\u2705 /api/hello");
  res.status(200).json({ message: "Hello!" });
};
