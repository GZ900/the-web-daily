const crypto =
  require("crypto");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readCookie(
  req,
  cookieName
) {
  const cookieHeader =
    req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies =
    cookieHeader.split(";");

  for (
    const cookie
    of cookies
  ) {
    const [
      name,
      ...valueParts
    ] =
      cookie
        .trim()
        .split("=");

    if (
      name !==
      cookieName
    ) {
      continue;
    }

    const rawValue =
      valueParts.join("=");

    try {
      return decodeURIComponent(
        rawValue
      );
    } catch {
      return null;
    }
  }

  return null;
}

function deviceIdentifier(
  req,
  res,
  next
) {
  let deviceId =
    readCookie(
      req,
      "webDailyDeviceId"
    );

  if (
    !deviceId ||
    !UUID_PATTERN.test(
      deviceId
    )
  ) {
    deviceId =
      crypto.randomUUID();

    res.cookie(
      "webDailyDeviceId",
      deviceId,
      {
        httpOnly: true,
        sameSite: "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        maxAge:
          365 *
          24 *
          60 *
          60 *
          1000
      }
    );
  }

  req.deviceIdentifier =
    deviceId;

  return next();
}

module.exports =
  deviceIdentifier;