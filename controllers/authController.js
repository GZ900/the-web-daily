const User = require("../models/User");

const {
  verifyPassword
} = require("../services/passwordService");

const {
  SESSION_DURATION,
  createSessionToken,
  hashSessionToken,
  getSessionExpiry
} = require("../services/authService");

const { getCookie } = require("../utils/cookies");

function getLogin(req, res) {
  if (req.user) {
    if (req.user.role === "editor") {
      return res.redirect("/editor");
    }

    return res.redirect("/reporter");
  }

  res.render("login", {
    pageTitle: "Login",
    errorMessage: null
  });
}

async function login(req, res) {
  try {
    const username =
      String(req.body.username || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");

    const user = await User.findOne({
      username
    }).select("+passwordHash +passwordSalt");

    if (
      !user ||
      !verifyPassword(
        password,
        user.passwordHash,
        user.passwordSalt
      )
    ) {
      return res.status(401).render("login", {
        pageTitle: "Login",
        errorMessage:
          "Invalid username or password"
      });
    }

    const rawToken = createSessionToken();

    const tokenHash =
      hashSessionToken(rawToken);

    const expiresAt =
      getSessionExpiry();

    user.sessions = user.sessions.filter(
      session =>
        session.expiresAt > new Date()
    );

    user.sessions.push({
      tokenHash,
      expiresAt
    });

    await user.save();

    res.cookie(
      "webDailySession",
      rawToken,
      {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_DURATION
      }
    );

    if (user.role === "editor") {
      return res.redirect("/editor");
    }

    res.redirect("/reporter");
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).send(
      "Internal Server Error"
    );
  }
}

async function logout(req, res) {
  try {
    const rawToken =
      getCookie(req, "webDailySession");

    if (rawToken && req.user) {
      const tokenHash =
        hashSessionToken(rawToken);

      await User.updateOne(
        {
          _id: req.user._id
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

    res.clearCookie("webDailySession");

    res.redirect("/login");
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).send(
      "Internal Server Error"
    );
  }
}

module.exports = {
  getLogin,
  login,
  logout
};