const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function GetItems(req, res) {
  try {
    const { category_id, min_price, max_price } = req.query;

    const db = await connectDB();
    const matchStage = { status: "Available" };

    if (category_id && ObjectId.isValid(category_id)) {
      matchStage.category_id = new ObjectId(category_id);
    }

    const hasMinPrice = min_price !== undefined && min_price !== "";
    const hasMaxPrice = max_price !== undefined && max_price !== "";

    if (hasMinPrice || hasMaxPrice) {
      matchStage.price = {};
      if (hasMinPrice) matchStage.price.$gte = parseFloat(min_price);
      if (hasMaxPrice) matchStage.price.$lte = parseFloat(max_price);
    }

    const items = await db
      .collection("clothing_items")
      .aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "categories",
            localField: "category_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "inventory",
            let: { itemId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$item_id", "$$itemId"] } } },
              {
                $lookup: {
                  from: "sizes",
                  localField: "size_id",
                  foreignField: "_id",
                  as: "size",
                },
              },
              { $unwind: { path: "$size", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 1,
                  size_id: 1,
                  quantity: 1,
                  available: 1,
                  size: {
                    _id: "$size._id",
                    size: "$size.size",
                  },
                },
              },
            ],
            as: "inventory",
          },
        },
        { $sort: { created_at: -1 } },
      ])
      .toArray();

    return res.status(200).json({ success: true, message: "Items fetched successfully", data: items });
  } catch (error) {
    console.error("GetItems.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { GetItems };
