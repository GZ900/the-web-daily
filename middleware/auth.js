const User =
  require("../models/User");

const {
  getCookie
} =
  require(
    "../utils/cookies"
  );

const {
  isValidSessionToken,
  hashSessionToken
} =
  require(
    "../services/authService"
  );

function isApiRequest(
  req
) {
  return req.originalUrl
    .startsWith("/api/");
}

function clearSessionCookie(
  res
) {
  res.clearCookie(
    "webDailySession",
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",

      secure:
        process.env.NODE_ENV ===
        "production"
    }
  );
}

function unauthenticated(
  req,
  res
) {
  if (
    isApiRequest(req)
  ) {
    return res
      .status(401)
      .json({
        message:
          "Authentication required"
      });
  }

  return res.redirect(
    "/login"
  );
}

function forbidden(
  req,
  res
) {
  if (
    isApiRequest(req)
  ) {
    return res
      .status(403)
      .json({
        message:
          "Forbidden"
      });
  }

  return res
    .status(403)
    .send(
      "Forbidden"
    );
}

async function attachCurrentUser(
  req,
  res,
  next
) {
  try {
    const sessionToken =
      getCookie(
        req,
        "webDailySession"
      );

    req.user = null;

    res.locals.currentUser =
      null;

    if (!sessionToken) {
      return next();
    }

    if (
      !isValidSessionToken(
        sessionToken
      )
    ) {
      clearSessionCookie(
        res
      );

      return next();
    }

    const tokenHash =
      hashSessionToken(
        sessionToken
      );

    const user =
      await User.findOne({
        sessions: {
          $elemMatch: {
            tokenHash,

            expiresAt: {
              $gt:
                new Date()
            }
          }
        }
      });

    if (!user) {
      clearSessionCookie(
        res
      );

      return next();
    }

    req.user =
      user;

    res.locals.currentUser =
      user;

    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(
  req,
  res,
  next
) {
  if (!req.user) {
    return unauthenticated(
      req,
      res
    );
  }

  return next();
}

function requireReporter(
  req,
  res,
  next
) {
  if (!req.user) {
    return unauthenticated(
      req,
      res
    );
  }

  if (
    req.user.role !==
    "reporter"
  ) {
    return forbidden(
      req,
      res
    );
  }

  return next();
}

function requireEditor(
  req,
  res,
  next
) {
  if (!req.user) {
    return unauthenticated(
      req,
      res
    );
  }

  if (
    req.user.role !==
    "editor"
  ) {
    return forbidden(
      req,
      res
    );
  }

  return next();
}

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireReporter,
  requireEditor
};