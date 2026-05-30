const connectDB = require("../../db/dbConnect");

async function GetAdminReturns(req, res) {
  try {
    const db = await connectDB();
    const returnVisibleStatuses = [
      "DELIVERED",
      "RETURN_REQUESTED",
      "APPROVED",
      "RETURNED",
      "COMPLETED",
      "LATE",
      "PENALTY_PAID",
      // Backward-compatible legacy values already present in older records
      "Return Requested",
      "Approved",
      "Returned",
      "Completed",
      "Late",
      "Penalty Paid",
    ];

    const returns = await db.collection("rental_orders").aggregate([
      {
        $match: {
          $or: [
            { status: { $in: returnVisibleStatuses } },
            { return_status: { $in: returnVisibleStatuses } },
          ],
        },
      },
      { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "clothing_items", localField: "item_id", foreignField: "_id", as: "item" } },
      { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "sizes", localField: "size_id", foreignField: "_id", as: "size" } },
      { $unwind: { path: "$size", preserveNullAndEmptyArrays: true } },
      { $project: { "user.password": 0 } },
      { $sort: { deliveryDate: -1, updated_at: -1, created_at: -1 } },
    ]).toArray();

    return res.status(200).json({ success: true, message: "Returns fetched successfully", data: returns });
  } catch (error) {
    console.error("GetAdminReturns.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { GetAdminReturns };