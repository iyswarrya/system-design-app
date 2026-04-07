import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "auth_token";

function getJwtSecretBytes() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: {
  userId: string;
  email: string;
}) {
  const secret = getJwtSecretBytes();
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  // jose expects seconds for maxAge; for expiry we use setExpirationTime with Date.
  // We'll parse common suffixes (d/h/m) loosely.
  const match = expiresIn.match(/^(\d+)([dhm])$/i);
  const n = match ? Number(match[1]) : 7;
  const unit = match ? match[2].toLowerCase() : "d";
  const ms = unit === "h" ? n * 60 * 60 * 1000 : unit === "m" ? n * 60 * 1000 : n * 24 * 60 * 60 * 1000;
  const exp = Math.floor((Date.now() + ms) / 1000);

  return await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  const secret = getJwtSecretBytes();
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

  const userId = payload.sub;
  const email = (payload.email as string | undefined) ?? "";
  if (!userId || typeof userId !== "string") {
    return null;
  }
  return { userId, email };
}

export { COOKIE_NAME };

