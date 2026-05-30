const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function CompleteReturn(req, res) {
  try {
    const { order_id, penalty_amount, damage_flag } = req.body;
    if (!order_id || !ObjectId.isValid(order_id))
      return res
        .status(400)
        .json({ success: false, message: "Valid order ID is required" });

    const db = await connectDB();
    const order = await db
      .collection("rental_orders")
      .findOne({ _id: new ObjectId(order_id) });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const parsedPenalty =
      penalty_amount === undefined ||
      penalty_amount === null ||
      penalty_amount === ""
        ? 0
        : parseFloat(penalty_amount);
    const penaltyValue = Number.isNaN(parsedPenalty) ? 0 : parsedPenalty;
    const damageValue =
      damage_flag === true ||
      damage_flag === "true" ||
      damage_flag === 1 ||
      damage_flag === "1";

    await db
      .collection("rental_orders")
      .updateOne(
        { _id: new ObjectId(order_id) },
        {
          $set: {
            status: "Completed",
            return_status: "Completed",
            penalty_amount: penaltyValue,
            damage_flag: damageValue,
            updated_at: new Date(),
          },
        },
      );

    return res
      .status(200)
      .json({ success: true, message: "Return completed successfully" });
  } catch (error) {
    console.error("CompleteReturn.js: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

module.exports = { CompleteReturn };
