import { firebaseAdmin } from "../lib/firebaseAdmin.js";
import prisma from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.get("Authorization") || "";
    const match = authHeader.match(/^Bearer (?<token>.+)$/);

    if (!match?.groups?.token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const firebaseUser = await firebaseAdmin
      .auth()
      .verifyIdToken(match.groups.token);
    const provider = firebaseUser.firebase?.sign_in_provider || null;

    if (firebaseUser.email_verified !== true && provider === "password") {
      return res.status(403).json({ error: "Email verification required" });
    }

    req.firebaseUser = firebaseUser;
    req.user = await prisma.user.upsert({
      where: { firebaseUid: firebaseUser.uid },
      update: {
        email: firebaseUser.email || null,
        displayName: firebaseUser.name || null,
        photoUrl: firebaseUser.picture || null,
        authProvider: provider,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: firebaseUser.name || null,
        photoUrl: firebaseUser.picture || null,
        authProvider: provider,
      },
    });
    return next();
  } catch (error) {
    console.error("Firebase token verification failed", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function userCanAccessStore(user, store) {
  return Boolean(
    store && user?.id && (!store.userId || store.userId === user.id),
  );
}
