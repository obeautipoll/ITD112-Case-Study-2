const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Allow all origins for testing

admin.initializeApp();
const db = admin.firestore();

exports.deleteUserByAdmin = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send({ error: "Method not allowed" });
    }

    const uid = req.body.uid;
    const requesterUid = req.headers["firebase-user-uid"]; // Pass current admin UID in header

    if (!uid || !requesterUid) {
      return res.status(400).send({ error: "UID is required" });
    }

    try {
      // Check admin role
      const requesterDoc = await db.collection("users").doc(requesterUid).get();
      if (!requesterDoc.exists || requesterDoc.data().role !== "admin") {
        return res.status(403).send({ error: "Only admins can delete users" });
      }

      // Delete user from Auth
      await admin.auth().deleteUser(uid);

      // Delete user document from Firestore
      await db.collection("users").doc(uid).delete();

      return res.status(200).send({ success: true, message: `User ${uid} deleted` });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).send({ error: error.message });
    }
  });
});
