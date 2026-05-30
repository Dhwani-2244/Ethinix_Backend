const { ObjectId } = require("mongodb");
const connectDB = require("../../db/dbConnect");

async function UpdateOrderStatus(req, res) {
  try {
    const { id, status } = req.body;
    if (!id || !ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Valid order ID is required" });

    // Support both legacy and new canonical statuses for backward compatibility
    const legacyStatuses = ["Rented", "Return Requested", "Approved", "Returned", "Completed", "Late", "Cancelled"];
    const canonicalStatuses = ["BOOKED", "DISPATCHED", "DELIVERED", "RETURN_REQUESTED", "APPROVED", "RETURNED", "COMPLETED", "LATE", "PENALTY_PAID"];
    const validStatuses = Array.from(new Set([...legacyStatuses, ...canonicalStatuses, "Late", "Returned", "Return Requested", "Approved", "Completed"]));

    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(", ")}` });

    const db = await connectDB();
    const order = await db.collection("rental_orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Helper: map some known legacy statuses to canonical ones; return null if not mappable
    const mapToCanonical = (s) => {
      if (!s || typeof s !== 'string') return null;
      if (canonicalStatuses.includes(s)) return s;
      const legacyMap = {
        "Return Requested": "RETURN_REQUESTED",
        "Returned": "RETURNED",
        "Late": "LATE",
        "Rented": "BOOKED",
        "Approved": "APPROVED",
        "Completed": "COMPLETED",
        "Cancelled": null,
        "Penalty Paid": "PENALTY_PAID",
      };
      if (legacyMap.hasOwnProperty(s)) return legacyMap[s];
      // Accept lowercase/alternative forms of canonical (e.g., 'late', 'returned')
      const up = s.toUpperCase();
      if (canonicalStatuses.includes(up)) return up;
      return null;
    };

    const canonicalCurrent = mapToCanonical(order.status);
    const canonicalNew = mapToCanonical(status);

    // Only enforce transition rules when both current and new map to canonical statuses
    // Allowed transitions: strictly control return-flow transitions
    const allowedTransitions = {
      BOOKED: ["DISPATCHED"],
      DISPATCHED: ["DELIVERED"],
      // DELIVERED: no direct normal transitions (return request must come from RequestReturn)
      DELIVERED: [],
      RETURN_REQUESTED: ["APPROVED"],
      APPROVED: ["RETURNED"],
      RETURNED: ["COMPLETED"],
    };
    if (canonicalCurrent && canonicalNew) {
      const allowed = allowedTransitions[canonicalCurrent] || [];
      if (!allowed.includes(canonicalNew)) {
        return res.status(400).json({ success: false, message: `Invalid status transition from ${order.status} to ${status}` });
      }
    }

    // Prepare update document. Only add date fields if not already present on the order (safe add/update)
    const updateSet = { status, updated_at: new Date() };

    // Determine whether the new status indicates a returned state (legacy or canonical)
    const isNewReturned = (canonicalNew === 'RETURNED') || (status === 'Returned');

    // Set date fields according to canonical new status. Do not overwrite existing date fields.
    if (canonicalNew === 'DISPATCHED' && !order.dispatchDate) updateSet.dispatchDate = new Date();
    if (canonicalNew === 'DELIVERED' && !order.deliveryDate) updateSet.deliveryDate = new Date();
    if (canonicalNew === 'RETURN_REQUESTED' && !order.returnRequestedAt) updateSet.returnRequestedAt = new Date();
    if (canonicalNew === 'RETURNED' && !order.returnedAt) updateSet.returnedAt = new Date();

    // Maintain legacy behavior: when status indicates a return (legacy 'Returned') increment inventory
    if (isNewReturned && order.status !== 'Returned' && order.status !== 'Completed') {
      await db.collection('inventory').updateOne({ item_id: order.item_id, size_id: order.size_id }, { $inc: { available: 1 } });
    }

    await db.collection('rental_orders').updateOne({ _id: new ObjectId(id) }, { $set: updateSet });

    // Fetch the updated order for response and potential auto-late logic
    let updatedOrder = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });

    // AUTO LATE LOGIC: if current date > return_date and order is not returned -> mark Late (legacy 'Late')
    try {
      const now = new Date();
      const returnDate = updatedOrder && updatedOrder.return_date ? new Date(updatedOrder.return_date) : null;
      const alreadyReturnedCanonical = mapToCanonical(updatedOrder.status) === 'RETURNED' || updatedOrder.status === 'Returned';
      if (returnDate && now > returnDate && !alreadyReturnedCanonical) {
        // Use legacy 'Late' to maintain compatibility with existing code that checks for 'Late'
        await db.collection('rental_orders').updateOne({ _id: new ObjectId(id) }, { $set: { status: 'Late', updated_at: new Date() } });
        updatedOrder = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
      }
    } catch (e) {
      console.error('Auto-late logic failed: ', e);
    }

    // Return the full updated order (status, date fields, and other existing fields unchanged)
    return res.status(200).json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error("UpdateOrderStatus.js: ", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = { UpdateOrderStatus };
