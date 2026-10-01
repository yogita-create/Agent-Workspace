import "dotenv/config";
import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection("users").find({}).toArray();
  for (const u of users) {
    const mem = await db.collection("memberships").findOne({ userId: u._id });
    if (!mem) {
      let org = await db.collection("organizations").findOne({ ownerId: u._id });
      if (!org) {
        const res = await db.collection("organizations").insertOne({
          name: `${u.name || "User"}'s Workspace`,
          ownerId: u._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        });
        org = { _id: res.insertedId };
      }
      await db.collection("memberships").insertOne({
        userId: u._id,
        organizationId: org._id,
        role: "admin",
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      });
      console.log("Provisioned org & membership for user:", u.email);
    }
  }

  const yogita = await db.collection("users").findOne({ email: "yogita@gmail.com" });
  if (yogita) {
    const yogitaMem = await db.collection("memberships").findOne({ userId: yogita._id });
    if (yogitaMem) {
      const updateRes = await db.collection("projects").updateMany(
        { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
        { $set: { organizationId: yogitaMem.organizationId } }
      );
      console.log("Updated legacy projects with Yogita org:", updateRes.modifiedCount);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
