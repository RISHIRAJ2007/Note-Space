
import React, { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "all", label: "All Notes", icon: "▤" },
  { id: "private", label: "Private Notes", icon: "🔒" },
  { id: "public", label: "Public Notes", icon: "🌐" },
  { id: "favorites", label: "Favorites", icon: "★" },
  { id: "archived", label: "Archived", icon: "▣" },
  { id: "trash", label: "Trash", icon: "♲" },
  { id: "profile", label: "My Profile", icon: "♙" }
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [activeTab, setActiveTab] = useState("dashboard");
  const [notes, setNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [editingId, setEditingId] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setNotes([]);
    setAllNotes([]);
    setActiveTab("dashboard");
    notify("Logged out successfully!");
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email || !password || (isRegister && !name)) {
      notify("Please fill all fields", "error");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "register" : "login";
      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password }
        )
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      if (isRegister) {
        notify("Account created! Please login.");
        setIsRegister(false);
        setPassword("");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveTab("dashboard");
        notify("Login successful! Welcome to NoteSpace.");
      }
    } catch (error) {
      notify(error.message || "Server connection failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const [mine, publicNotes] = await Promise.all([
        request("/notes?view=all"),
        request("/notes?view=public")
      ]);
      setNotes(mine);
      setAllNotes(publicNotes);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  useEffect(() => {
    if (token) loadNotes();
  }, [token]);

  const changeTab = async (tab) => {
    setActiveTab(tab);
    setSearch("");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setVisibility("private");

    if (tab === "dashboard" || tab === "profile") return;

    try {
      const data = await request(`/notes?view=${tab}`);
      setNotes(data);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const saveNote = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      notify("Please enter title and description", "error");
      return;
    }

    try {
      const url = editingId ? `/notes/${editingId}` : "/notes";
      const method = editingId ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify({ title, description, visibility })
      });

      notify(editingId ? "Note updated successfully!" : "Note created successfully!");

      setTitle("");
      setDescription("");
      setVisibility("private");
      setEditingId(null);
      await loadNotes();
      const updated = await request(`/notes?view=${activeTab === "dashboard" ? "all" : activeTab}`);
      setNotes(updated);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const editNote = (note) => {
    setTitle(note.title);
    setDescription(note.description);
    setVisibility(note.visibility || "private");
    setEditingId(note._id);
    setActiveTab("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const noteAction = async (id, action, method = "PATCH") => {
    try {
      const data = await request(`/notes/${id}/${action}`, { method });
      notify(data.message || "Action completed");
      const updated = await request(`/notes?view=${activeTab}`);
      setNotes(updated);
      await loadNotes();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const moveToTrash = async (id) => {
    if (!window.confirm("Move this note to Trash?")) return;
    try {
      const data = await request(`/notes/${id}`, { method: "DELETE" });
      notify(data.message);
      const updated = await request(`/notes?view=${activeTab}`);
      setNotes(updated);
      await loadNotes();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const permanentlyDelete = async (id) => {
    if (!window.confirm("Permanently delete this note? This cannot be undone.")) return;
    await noteAction(id, "permanent", "DELETE");
  };

  const isOwner = (note) => {
    const ownerId = note.user?._id || note.user;
    return ownerId && user?._id && ownerId.toString() === user._id.toString();
  };

  const visibleNotes = (activeTab === "dashboard" || activeTab === "profile")
    ? []
    : notes.filter((note) =>
        `${note.title} ${note.description} ${note.user?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );

  const privateCount = notes.filter(n => n.visibility === "private" && !n.isDeleted && !n.isArchived).length;
  const publicCount = allNotes.length;
  const favoriteCount = notes.filter(n => n.isFavorite && !n.isDeleted).length;
  const archivedCount = notes.filter(n => n.isArchived && !n.isDeleted).length;
  const trashCount = notes.filter(n => n.isDeleted).length;

  if (!token) {
    return (
      <div className="auth-page">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        <div className="auth-card">
          <div className="logo-mark">✦</div>
          <h1>NoteSpace</h1>
          <p className="muted">Your thoughts. Your space. Your productivity.</p>

          <div className="auth-tabs">
            <button className={!isRegister ? "selected" : ""} onClick={() => setIsRegister(false)}>Login</button>
            <button className={isRegister ? "selected" : ""} onClick={() => setIsRegister(true)}>Register</button>
          </div>

          <form onSubmit={handleAuth}>
            {isRegister && (
              <label>Full Name
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </label>
            )}
            <label>Email Address
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </label>
            <button className="primary-btn full" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account →" : "Login →"}
            </button>
          </form>
          <p className="auth-foot">Organize your ideas in one secure place.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <aside className="sidebar">
        <div className="brand"><span className="logo-mark">✦</span> NoteSpace</div>
        <p className="nav-caption">WORKSPACE</p>

        <nav>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => changeTab(tab.id)}
            >
              <span>{tab.icon}</span>{tab.label}
              {tab.id === "all" && <small>{notes.filter(n => !n.isDeleted && !n.isArchived).length}</small>}
              {tab.id === "private" && <small>{privateCount}</small>}
              {tab.id === "public" && <small>{publicCount}</small>}
              {tab.id === "favorites" && <small>{favoriteCount}</small>}
              {tab.id === "archived" && <small>{archivedCount}</small>}
              {tab.id === "trash" && <small>{trashCount}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{(user?.name || "U")[0].toUpperCase()}</div>
          <div className="user-info">
            <strong>{user?.name || "User"}</strong>
            <small>{user?.email}</small>
          </div>
          <button className="logout-icon" title="Logout" onClick={logout}>↪</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE</p>
            <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
          </div>
          <div className="top-user">
            <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <div className="avatar">{(user?.name || "U")[0].toUpperCase()}</div>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow light">YOUR IDEAS, ORGANIZED</span>
                <h2>Welcome back, {user?.name || "there"}! 👋</h2>
                <p>Keep your thoughts organized and your ideas moving.</p>
                <button className="welcome-btn" onClick={() => changeTab("all")}>Explore my notes →</button>
              </div>
              <div className="welcome-art">✧</div>
            </section>

            <div className="stats-grid">
              <div className="stat"><span>▤</span><small>My Notes</small><strong>{notes.filter(n => !n.isDeleted && !n.isArchived).length}</strong></div>
              <div className="stat"><span>🔒</span><small>Private Notes</small><strong>{privateCount}</strong></div>
              <div className="stat"><span>🌐</span><small>Public Notes</small><strong>{notes.filter(n => n.visibility === "public" && !n.isDeleted && !n.isArchived).length}</strong></div>
              <div className="stat"><span>★</span><small>Favorites</small><strong>{favoriteCount}</strong></div>
            </div>

            <div className="section-title">
              <div><h2>Recent Notes</h2><p>Your latest saved ideas</p></div>
              <button className="text-btn" onClick={() => changeTab("all")}>View all →</button>
            </div>
            <div className="notes-grid">
              {notes.filter(n => !n.isDeleted && !n.isArchived).slice(0, 4).map(note => (
                <NoteCard key={note._id} note={note} isOwner={isOwner(note)} onEdit={editNote} onTrash={moveToTrash} onFavorite={() => noteAction(note._id, "favorite")} onArchive={() => noteAction(note._id, "archive")} />
              ))}
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <section className="profile-panel">
            <div className="profile-large">{(user?.name || "U")[0].toUpperCase()}</div>
            <h2>{user?.name || "User"}</h2>
            <p>{user?.email}</p>
            <div className="profile-details">
              <div><span>Account</span><strong>Active</strong></div>
              <div><span>Total Notes</span><strong>{notes.length}</strong></div>
              <div><span>Private Notes</span><strong>{privateCount}</strong></div>
              <div><span>Public Notes</span><strong>{notes.filter(n => n.visibility === "public" && !n.isDeleted).length}</strong></div>
            </div>
            <button className="danger-btn" onClick={logout}>Logout from account</button>
          </section>
        )}

        {activeTab !== "dashboard" && activeTab !== "profile" && (
          <>
            {["all", "private"].includes(activeTab) && (
              <section className="create-panel">
                <div className="section-title">
                  <div><h2>{editingId ? "Edit Note" : "Create a Note"}</h2><p>Capture something worth remembering.</p></div>
                </div>
                <form onSubmit={saveNote} className="note-form">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..." />
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Write your thoughts here..." rows="4" />
                  <div className="form-bottom">
                    <label className="visibility-label">Visibility
                      <select value={visibility} onChange={e => setVisibility(e.target.value)}>
                        <option value="private">🔒 Private — Only me</option>
                        <option value="public">🌐 Public — Everyone can view</option>
                      </select>
                    </label>
                    <div className="form-buttons">
                      {editingId && <button type="button" className="secondary-btn" onClick={() => { setEditingId(null); setTitle(""); setDescription(""); }}>Cancel</button>}
                      <button className="primary-btn">{editingId ? "Save Changes" : "+ Add Note"}</button>
                    </div>
                  </div>
                </form>
              </section>
            )}

            <div className="section-title notes-heading">
              <div>
                <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p>
                  {activeTab === "public" ? "Explore notes shared publicly by users." :
                   activeTab === "private" ? "Only you can see these notes." :
                   activeTab === "trash" ? "Restore notes or permanently delete them." :
                   "Manage your saved notes."}
                </p>
              </div>
              <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕ Search notes..." />
            </div>

            {visibleNotes.length === 0 ? (
              <div className="empty">
                <div>▤</div><h3>No notes found</h3>
                <p>There are no notes in this section yet.</p>
              </div>
            ) : (
              <div className="notes-grid">
                {visibleNotes.map(note => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    isOwner={isOwner(note)}
                    onEdit={editNote}
                    onTrash={moveToTrash}
                    onFavorite={() => noteAction(note._id, "favorite")}
                    onArchive={() => noteAction(note._id, "archive")}
                    onRestore={() => noteAction(note._id, "restore")}
                    onPermanentDelete={() => permanentlyDelete(note._id)}
                    isTrash={activeTab === "trash"}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NoteCard({ note, isOwner, onEdit, onTrash, onFavorite, onArchive, onRestore, onPermanentDelete, isTrash }) {
  return (
    <article className="note-card">
      <div className="note-card-head">
        <span className="note-type">{note.visibility === "public" ? "🌐 Public" : "🔒 Private"}</span>
        <span className="note-star">{note.isFavorite ? "★" : ""}</span>
      </div>

      <h3>{note.title}</h3>
      <p className="note-description">{note.description}</p>

      {note.user?.name && <small className="note-author">By {note.user.name}</small>}

      <div className="note-meta">
        <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("en-IN") : "Recently"}</span>
        <div className="note-actions">
          {isTrash ? (
            isOwner && <>
              <button title="Restore" onClick={() => onRestore(note._id)}>↶</button>
              <button title="Permanently delete" onClick={() => onPermanentDelete(note._id)}>×</button>
            </>
          ) : isOwner && (
            <>
              <button title="Favorite" onClick={() => onFavorite(note._id)}>{note.isFavorite ? "★" : "☆"}</button>
              <button title="Archive" onClick={() => onArchive(note._id)}>▣</button>
              <button title="Edit" onClick={() => onEdit(note)}>✎</button>
              <button title="Move to trash" onClick={() => onTrash(note._id)}>♲</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default App;
