const jwt = require("jsonwebtoken");
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não definido");
}
const SECRET = process.env.JWT_SECRET;
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
module.exports = { signToken, requireAuth };
