/* scripts/setAdmin.js */

const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/shan5/.firebase/stash-admin-key.json");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

async function setAdmin() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question("Enter your Stash admin account email: ")).trim().toLowerCase();

    if (!email) {
      throw new Error("An email address is required.");
    }

    const user = await auth.getUserByEmail(email);

    if (!user.emailVerified) {
      throw new Error("This account's email is not verified. Verify it before assigning admin access.");
    }

    const existingClaims = user.customClaims || {};

    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      admin: true,
    });

    console.log("\nAdmin role assigned successfully.");
    console.log(`Email: ${user.email}`);
    console.log(`UID: ${user.uid}`);
    console.log("Ask this account to sign out and sign in again to refresh its token.");
  } catch (error) {
    console.error("\nCould not assign admin role:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await admin.app().delete();
  }
}

setAdmin();
