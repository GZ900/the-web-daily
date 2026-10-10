function getCookie(
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

    if (
      rawValue.length >
      4096
    ) {
      return null;
    }

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

module.exports = {
  getCookie
};