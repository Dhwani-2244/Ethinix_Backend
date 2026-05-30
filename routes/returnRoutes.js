const express = require("express");
const authMiddleware = require("../middleware/auth");
const { RequestReturn } = require("../apis/admin/RequestReturn");
const { ApproveReturn } = require("../apis/admin/ApproveReturn");
const { CompleteReturn } = require("../apis/admin/CompleteReturn");
const { GetAdminReturns } = require("../apis/admin/GetAdminReturns");

const router = express.Router();

router.post("/return/request", authMiddleware, RequestReturn);
router.post("/return/approve", authMiddleware, ApproveReturn);
router.post("/return/complete", authMiddleware, CompleteReturn);
router.get("/admin/returns", authMiddleware, GetAdminReturns);

module.exports = router;
