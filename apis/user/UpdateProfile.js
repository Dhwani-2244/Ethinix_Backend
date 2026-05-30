const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function UpdateProfile(req, res) {
  try {
    const { name, phone, address } = req.body;
    const db = await connectDB();
    const updateFields = { updated_at: new Date() };
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (address) {
      if (address.trim().length < 10) {
        return res.status(400).json({ success: false, message: "Address must be at least 10 characters long" });
      }
      updateFields.address = address.trim();
    }
    if (req.file) updateFields.profile_image = `/uploads/profiles/${req.file.filename}`;

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(req.user._id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("UpdateProfile.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
module.exports = { UpdateProfile };
