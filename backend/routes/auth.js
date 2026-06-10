import express from "express";

const router = express.Router();

router.get("/me", (req, res) => {
  return res.json({
    id: req.user.id,
    firebaseUid: req.user.firebaseUid,
    email: req.user.email,
    displayName: req.user.displayName,
    photoUrl: req.user.photoUrl,
    authProvider: req.user.authProvider,
  });
});

export default router;
