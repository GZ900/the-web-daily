const User =
  require("../models/User");

const {
  verifyPassword
} =
  require(
    "../services/passwordService"
  );

const {
  SESSION_DURATION,
  createSessionToken,
  isValidSessionToken,
  hashSessionToken,
  getSessionExpiry
} =
  require(
    "../services/authService"
  );

const {
  getCookie
} =
  require(
    "../utils/cookies"
  );

const MAX_USERNAME_LENGTH =
  50;

const MAX_PASSWORD_LENGTH =
  256;

const MAX_ACTIVE_SESSIONS =
  10;

function getLogin(
  req,
  res
) {
  if (req.user) {
    if (
      req.user.role ===
      "editor"
    ) {
      return res.redirect(
        "/editor"
      );
    }

    return res.redirect(
      "/reporter"
    );
  }

  return res.render(
    "login",
    {
      pageTitle:
        "Login",

      errorMessage:
        null
    }
  );
}

async function login(
  req,
  res
) {
  try {
    const username =
      String(
        req.body.username ||
        ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        req.body.password ||
        ""
      );

    if (
      !username ||
      !password ||
      username.length >
        MAX_USERNAME_LENGTH ||
      password.length >
        MAX_PASSWORD_LENGTH
    ) {
      return res
        .status(401)
        .render(
          "login",
          {
            pageTitle:
              "Login",

            errorMessage:
              "Invalid username or password"
          }
        );
    }

    const user =
      await User.findOne({
        username
      })
        .select(
          "+passwordHash +passwordSalt"
        );

    if (
      !user ||
      !verifyPassword(
        password,
        user.passwordHash,
        user.passwordSalt
      )
    ) {
      return res
        .status(401)
        .render(
          "login",
          {
            pageTitle:
              "Login",

            errorMessage:
              "Invalid username or password"
          }
        );
    }

    const rawToken =
      createSessionToken();

    const tokenHash =
      hashSessionToken(
        rawToken
      );

    const expiresAt =
      getSessionExpiry();

    const now =
      new Date();

    let validSessions =
      user.sessions.filter(
        session =>
          session.expiresAt &&
          session.expiresAt >
            now
      );

    /*
      Prevent the embedded session
      array from growing without limit.
    */
    if (
      validSessions.length >=
      MAX_ACTIVE_SESSIONS
    ) {
      validSessions =
        validSessions.slice(
          -(
            MAX_ACTIVE_SESSIONS -
            1
          )
        );
    }

    validSessions.push({
      tokenHash,
      expiresAt
    });

    user.sessions =
      validSessions;

    await user.save();

    res.cookie(
      "webDailySession",
      rawToken,
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        maxAge:
          SESSION_DURATION
      }
    );

    if (
      user.role ===
      "editor"
    ) {
      return res.redirect(
        "/editor"
      );
    }

    return res.redirect(
      "/reporter"
    );
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function logout(
  req,
  res
) {
  try {
    const rawToken =
      getCookie(
        req,
        "webDailySession"
      );

    if (
      rawToken &&
      req.user &&
      isValidSessionToken(
        rawToken
      )
    ) {
      const tokenHash =
        hashSessionToken(
          rawToken
        );

      await User.updateOne(
        {
          _id:
            req.user._id
        },
        {
          $pull: {
            sessions: {
              tokenHash
            }
          }
        }
      );
    }

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

    return res.redirect(
      "/login"
    );
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

module.exports = {
  getLogin,
  login,
  logout
};