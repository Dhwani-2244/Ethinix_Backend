const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function RequestReturn(req, res) {
  try {
    const {
      order_id,
      damage_flag,
      damage_image,
      penalty_amount,
      return_date,
      return_status,
    } = req.body;
    if (!order_id || !ObjectId.isValid(order_id)) return res.status(400).json({ success: false, message: "Valid order ID is required" });

    const db = await connectDB();
    const order = await db.collection("rental_orders").findOne({ _id: new ObjectId(order_id) });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const currentStatus = String(order?.status || "").trim().toUpperCase();
    if (currentStatus !== "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Return request allowed only for delivered orders",
      });
    }

    const damageValue = damage_flag === true || damage_flag === "true" || damage_flag === 1 || damage_flag === "1";
    const imageValue = typeof damage_image === "string" ? damage_image.trim() : "";
    const parsedPenalty = penalty_amount === undefined || penalty_amount === null || penalty_amount === "" ? 0 : parseFloat(penalty_amount);
    const penaltyValue = Number.isNaN(parsedPenalty) ? 0 : parsedPenalty;

    await db.collection("rental_orders").updateOne(
      { _id: new ObjectId(order_id) },
      {
        $set: {
          status: "RETURN_REQUESTED",
          return_status: return_status || "RETURN_REQUESTED",
          return_date: return_date ? new Date(return_date) : (order.return_date || new Date()),
          damage_flag: damageValue,
          damage_image: imageValue,
          penalty_amount: penaltyValue,
          updated_at: new Date(),
        },
      },
    );

    return res.status(200).json({ success: true, message: "Return requested successfully" });
  } catch (error) {
    console.error("RequestReturn.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { RequestReturn };