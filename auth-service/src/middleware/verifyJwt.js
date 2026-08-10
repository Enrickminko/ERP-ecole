/**
 * WEEK 1 | auth-service/src/middleware/verifyJwt.js
 * ---------------------------------------------------------------
 * Reads the "Authorization: Bearer <token>" header, checks the token
 * signature + expiry, and puts the decoded payload on req.user.
 *
 * If the token is missing/invalid the request is rejected with 401
 * and never reaches the route handler.
 */
const jwt = require("jsonwebtoken");

function verifyJwt(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.slice(7); // remove the word "Bearer "

  try {
    // jwt.verify recomputes the signature using JWT_SECRET.
    // If even one character of the token was changed, this throws.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, email, role, iat, exp }
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired, please log in again" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = verifyJwt;
