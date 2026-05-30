const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const connectDB = require("../../db/dbConnect");

async function VerifyPayment(req, res) {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_type, penalty_amount } = req.body;

    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ success: false, message: "All payment fields are required" });

    const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (generatedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: "Invalid payment signature" });

    const db = await connectDB();
    const order = await db.collection("rental_orders").findOne({ _id: new ObjectId(order_id), user_id: new ObjectId(req.user._id) });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const isPenaltyPayment = String(payment_type || "").toLowerCase() === "penalty";
    const parsedPenalty = penalty_amount === undefined || penalty_amount === null || penalty_amount === "" ? 0 : parseFloat(penalty_amount);
    const penaltyValue = Number.isNaN(parsedPenalty) ? 0 : parsedPenalty;

    const deposit_amount = Math.round(order.total_amount * 0.5);
    const rent_amount = order.total_amount - deposit_amount;
    const paymentTotal = isPenaltyPayment ? penaltyValue : order.total_amount;

    await db.collection("payments").insertOne({
      order_id: new ObjectId(order_id),
      user_id: new ObjectId(req.user._id),
      total_amount: paymentTotal,
      deposit_amount: isPenaltyPayment ? 0 : deposit_amount,
      rent_amount: isPenaltyPayment ? paymentTotal : rent_amount,
      payment_type: isPenaltyPayment ? "Penalty" : "Razorpay",
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      status: "Success",
      date: new Date(),
    });

    await db.collection("rental_orders").updateOne(
      { _id: new ObjectId(order_id) },
      {
        $set: {
          payment_status: "Success",
          penalty_paid: isPenaltyPayment ? true : order.penalty_paid,
          penalty_amount: isPenaltyPayment ? penaltyValue : (order.penalty_amount || 0),
          return_status: isPenaltyPayment ? "Penalty Paid" : (order.return_status || order.status),
          updated_at: new Date(),
        },
      },
    );

    return res.status(200).json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error("VerifyPayment.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
module.exports = { VerifyPayment };
