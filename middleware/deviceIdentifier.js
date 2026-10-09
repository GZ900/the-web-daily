const crypto = require("crypto");

function getCookie(req, cookieName) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function deviceIdentifier(req, res, next) {
  let deviceId = getCookie(req, "webDailyDeviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();

    res.cookie("webDailyDeviceId", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000
    });
  }

  req.deviceIdentifier = deviceId;

  next();
}

module.exports = deviceIdentifier;