
const jwt = require("jsonwebtoken");

function gatekeep(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing authorization" });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json(
      { error: "wrong or old token" }
    );
  }
}

function socketguard(str) {
  try {
    return jwt.verify(str, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { gatekeep, socketguard };