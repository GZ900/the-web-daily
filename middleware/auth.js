const User = require("../models/User");

const { getCookie } = require("../utils/cookies");

const {
  hashSessionToken
} = require("../services/authService");

async function attachCurrentUser(req, res, next) {
  try {
    const sessionToken =
      getCookie(req, "webDailySession");

    req.user = null;
    res.locals.currentUser = null;

    if (!sessionToken) {
      return next();
    }

    const tokenHash =
      hashSessionToken(sessionToken);

    const user = await User.findOne({
      sessions: {
        $elemMatch: {
          tokenHash,
          expiresAt: {
            $gt: new Date()
          }
        }
      }
    });

    if (user) {
      req.user = user;
      res.locals.currentUser = user;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  next();
}

function requireReporter(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  if (req.user.role !== "reporter") {
    return res.status(403).send("Forbidden");
  }

  next();
}

function requireEditor(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  if (req.user.role !== "editor") {
    return res.status(403).send("Forbidden");
  }

  next();
}

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireReporter,
  requireEditor
};