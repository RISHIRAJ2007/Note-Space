
const express = require("express");
const router = express.Router();

const {
  createNote,
  getNotes,
  updateNote,
  toggleFavorite,
  toggleArchive,
  deleteNote,
  restoreNote,
  permanentDelete
} = require("../controllers/noteController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", createNote);
router.get("/", getNotes);

router.patch("/:id/favorite", toggleFavorite);
router.patch("/:id/archive", toggleArchive);
router.patch("/:id/restore", restoreNote);

router.delete("/:id/permanent", permanentDelete);
router.delete("/:id", deleteNote);

router.put("/:id", updateNote);

module.exports = router;
