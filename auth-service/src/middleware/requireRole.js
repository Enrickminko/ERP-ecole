/**
 * WEEK 1 | auth-service/src/middleware/requireRole.js
 * ---------------------------------------------------------------
 * ROLE-BASED AUTHORIZATION.
 * Must run AFTER verifyJwt, because it reads req.user.role.
 *
 * Usage:  router.get('/admin/users', verifyJwt, requireRole('admin'), handler)
 *
 * >>> THIS IS THE FILE TO EDIT if the examiner asks you to change an
 * >>> authorization rule live (e.g. "let students see this too").
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires role: ${allowedRoles.join(" or ")}. You are: ${req.user.role}.`,
      });
    }

    return next();
  };
}

module.exports = requireRole;
