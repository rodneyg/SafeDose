// api/hello.js
module.exports = (req, res) => {
  console.log("✅ /api/hello");
  res.status(200).json({ message: "Hello!" });
};
