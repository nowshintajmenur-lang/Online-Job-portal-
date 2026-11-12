import { useEffect, useState } from "react";
import { Search, Send, Paperclip, MoreVertical, CheckCheck } from "lucide-react";
import { apiFetch } from "../../api";

const COLORS = [
  ["#DBEAFE", "#2563EB"],
  ["#FCE7F3", "#BE185D"],
  ["#D1FAE5", "#047857"],
  ["#FEF3C7", "#B45309"],
];

function fmt(t) {
  if (!t) return "";
  const d = new Date(t);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadList() {
    try {
      const items = await apiFetch("/api/messages");
      setConversations(
        items.map((c, i) => ({
          ...c,
          id: c.userId,
          avatarColor: COLORS[i % COLORS.length][0],
          avatarText: COLORS[i % COLORS.length][1],
          time: fmt(c.time),
          online: false,
        }))
      );
      setActiveId((cur) => cur || (items[0] && items[0].userId) || null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let stop = false;
    const load = () =>
      apiFetch("/api/messages/" + activeId)
        .then((m) => !stop && setThread(m.map((x) => ({ ...x, time: fmt(x.time) }))))
        .catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, 5000); // simple refresh for new messages
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [activeId]);

  const base = conversations.find((c) => c.id === activeId);
  const active = base ? { ...base, messages: thread } : null;

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.role || "").toLowerCase().includes(search.toLowerCase())
  );

  function selectConversation(id) {
    setActiveId(id);
    setThread([]);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    try {
      const m = await apiFetch("/api/messages", { method: "POST", body: { to: activeId, text } });
      setThread((prev) => [...prev, { ...m, time: fmt(m.time) }]);
      loadList();
    } catch (e) {
      setError(e.message);
      setDraft(text);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#111827", marginBottom: "0.3rem", fontSize: "1.7rem" }}>Messages</h1>
      <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>
        Conversations with employers about your applications.
      </p>
      {error && <p style={{ color: "#DC2626", marginBottom: "1rem" }}>{error}</p>}

      <div
        style={{
          display: "flex",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "14px",
          overflow: "hidden",
          height: "600px",
        }}
      >
        {/* Conversation list */}
        <div
          style={{
            width: "320px",
            borderRight: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "1rem", borderBottom: "1px solid #F3F4F6" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "0.5rem 0.8rem",
                background: "#F9FAFB",
              }}
            >
              <Search size={15} color="#9CA3AF" />
              <input
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "0.85rem",
                  width: "100%",
                  background: "transparent",
                }}
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.9rem 1rem",
                  cursor: "pointer",
                  background: c.id === activeId ? "#F0F5FF" : "transparent",
                  borderLeft: c.id === activeId ? "3px solid #2563EB" : "3px solid transparent",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: c.avatarColor,
                      color: c.avatarText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  {c.online && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#22C55E",
                        border: "2px solid #FFFFFF",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <p
                      style={{
                        margin: 0,
                        color: "#111827",
                        fontWeight: 600,
                        fontSize: "0.87rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.name}
                    </p>
                    <span style={{ color: "#9CA3AF", fontSize: "0.7rem", flexShrink: 0, marginLeft: "0.4rem" }}>
                      {c.time}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0.15rem 0 0",
                      color: c.unread > 0 ? "#111827" : "#6B7280",
                      fontWeight: c.unread > 0 ? 600 : 400,
                      fontSize: "0.78rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.lastMessage}
                  </p>
                </div>

                {c.unread > 0 && (
                  <span
                    style={{
                      background: "#2563EB",
                      color: "#FFFFFF",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      borderRadius: "9999px",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {c.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {active ? (
            <>
              {/* Chat header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: active.avatarColor,
                      color: active.avatarText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {active.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#111827", fontWeight: 700, fontSize: "0.9rem" }}>
                      {active.name}
                    </p>
                    <p style={{ margin: 0, color: "#6B7280", fontSize: "0.75rem" }}>
                      {active.role} {active.online && "· Online"}
                    </p>
                  </div>
                </div>
                <MoreVertical size={18} color="#9CA3AF" style={{ cursor: "pointer" }} />
              </div>

              {/* Message thread */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.9rem",
                  background: "#F9FAFB",
                }}
              >
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                      maxWidth: "70%",
                    }}
                  >
                    <div
                      style={{
                        background: m.from === "me" ? "#2563EB" : "#FFFFFF",
                        color: m.from === "me" ? "#FFFFFF" : "#111827",
                        border: m.from === "me" ? "none" : "1px solid #E5E7EB",
                        padding: "0.7rem 1rem",
                        borderRadius: m.from === "me" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        fontSize: "0.87rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                        marginTop: "0.25rem",
                      }}
                    >
                      <span style={{ color: "#9CA3AF", fontSize: "0.7rem" }}>{m.time}</span>
                      {m.from === "me" && <CheckCheck size={13} color="#2563EB" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid #E5E7EB",
                }}
              >
                <Paperclip size={18} color="#9CA3AF" style={{ cursor: "pointer", flexShrink: 0 }} />
                <input
                  style={{
                    flex: 1,
                    border: "1px solid #E5E7EB",
                    borderRadius: "9999px",
                    padding: "0.65rem 1.1rem",
                    fontSize: "0.87rem",
                    outline: "none",
                  }}
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    background: "#2563EB",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Send size={16} color="#FFFFFF" />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}