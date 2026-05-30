const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function ApproveReturn(req, res) {
  try {
    const { order_id } = req.body;
    if (!order_id || !ObjectId.isValid(order_id)) return res.status(400).json({ success: false, message: "Valid order ID is required" });

    const db = await connectDB();
    const order = await db.collection("rental_orders").findOne({ _id: new ObjectId(order_id) });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    await db.collection("rental_orders").updateOne(
      { _id: new ObjectId(order_id) },
      { $set: { status: "APPROVED", return_status: "APPROVED", updated_at: new Date() } },
    );

    return res.status(200).json({ success: true, message: "Return approved successfully" });
  } catch (error) {
    console.error("ApproveReturn.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { ApproveReturn };