
const Note = require("../models/Note");

// Create a note
exports.createNote = async (req, res) => {
  try {
    const { title, description, visibility } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required"
      });
    }

    const note = await Note.create({
      title,
      description,
      visibility: visibility === "public" ? "public" : "private",
      user: req.user.id
    });

    res.status(201).json({
      message: "Note created successfully",
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notes according to selected tab
exports.getNotes = async (req, res) => {
  try {
    const { view = "all" } = req.query;
    let filter = {};

    if (view === "public") {
      filter = {
        visibility: "public",
        isDeleted: false,
        isArchived: false
      };
    } else {
      filter.user = req.user.id;

      if (view === "private") {
        filter.visibility = "private";
        filter.isDeleted = false;
        filter.isArchived = false;
      } else if (view === "favorites") {
        filter.isFavorite = true;
        filter.isDeleted = false;
        filter.isArchived = false;
      } else if (view === "archived") {
        filter.isArchived = true;
        filter.isDeleted = false;
      } else if (view === "trash") {
        filter.isDeleted = true;
      } else {
        filter.isDeleted = false;
        filter.isArchived = false;
      }
    }

    const notes = await Note.find(filter)
      .populate("user", "name email")
      .sort({ updatedAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a note (only owner)
exports.updateNote = async (req, res) => {
  try {
    const { title, description, visibility } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found or access denied"
      });
    }

    if (title !== undefined) note.title = title;
    if (description !== undefined) note.description = description;

    if (visibility !== undefined) {
      if (!["public", "private"].includes(visibility)) {
        return res.status(400).json({
          message: "Invalid visibility"
        });
      }
      note.visibility = visibility;
    }

    await note.save();

    res.json({
      message: "Note updated successfully",
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Favorite / unfavorite
exports.toggleFavorite = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.isFavorite = !note.isFavorite;
    await note.save();

    res.json({
      message: note.isFavorite ? "Added to favorites" : "Removed from favorites",
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Archive / unarchive
exports.toggleArchive = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.isArchived = !note.isArchived;
    await note.save();

    res.json({
      message: note.isArchived ? "Note archived" : "Note unarchived",
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Move note to trash
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        isDeleted: false
      },
      { isDeleted: true },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore from trash
exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        isDeleted: true
      },
      { isDeleted: false },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ message: "Note not found in trash" });
    }

    res.json({ message: "Note restored successfully", note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanently delete from trash
exports.permanentDelete = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: true
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found in trash" });
    }

    res.json({ message: "Note permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
