import { useState, useEffect } from "react";
import { Search, Building2, Calendar, ExternalLink } from "lucide-react";
import { apiFetch } from "../../api";

const STATUS_MAP = {
  Applied: "Applied",
  "Under Review": "Reviewing",
  Shortlisted: "Reviewing",
  Interview: "Interview",
  Selected: "Hired",
  Rejected: "Rejected",
};

const STATUS_TABS = ["All", "Applied", "Reviewing", "Interview", "Rejected", "Hired"];

function statusStyle(status) {
  switch (status) {
    case "Interview":
      return { background: "#111827", color: "#FFFFFF" };
    case "Reviewing":
      return { background: "#FEF3C7", color: "#B45309" };
    case "Applied":
      return { background: "#DBEAFE", color: "#2563EB" };
    case "Rejected":
      return { background: "#FEE2E2", color: "#B91C1C" };
    case "Hired":
      return { background: "#D1FAE5", color: "#047857" };
    default:
      return { background: "#F3F4F6", color: "#6B7280" };
  }
}

export default function MyApplications() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/applications/mine")
      .then((rows) =>
        setApps(
          rows
            .filter((a) => a.job)
            .map((a) => ({
              id: a._id,
              jobTitle: a.job.title,
              company: a.job.companyName || "Employer",
              dateApplied: new Date(a.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              status: STATUS_MAP[a.status] || "Applied",
              letter: (a.job.companyName || "E").charAt(0).toUpperCase(),
            }))
        )
      )
      .catch((e) => setError(e.message));
  }, []);

  const filtered = apps.filter((app) => {
    const matchesSearch =
      app.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      app.company.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "All" || app.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] =
      tab === "All"
        ? apps.length
        : apps.filter((a) => a.status === tab).length;
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#111827", marginBottom: "0.2rem" }}>My Applications</h1>
      <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>
        Track the status of jobs you've applied to.
      </p>
      {error && <p style={{ color: "#DC2626", marginBottom: "1rem" }}>{error}</p>}

      {/* Summary stat strip */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {STATUS_TABS.filter((t) => t !== "All").map((tab) => (
          <div
            key={tab}
            style={{
              flex: "1 1 140px",
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "10px",
              padding: "1rem",
            }}
          >
            <p style={{ margin: 0, color: "#6B7280", fontSize: "0.8rem" }}>{tab}</p>
            <h2 style={{ margin: "0.2rem 0 0", color: "#111827", fontSize: "1.5rem" }}>
              {counts[tab]}
            </h2>
          </div>
        ))}
      </div>

      {/* Search + Filter card */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.2rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "0.6rem 1rem",
              width: "320px",
            }}
          >
            <Search size={16} color="#9CA3AF" />
            <input
              style={{
                border: "none",
                outline: "none",
                fontSize: "0.9rem",
                width: "100%",
              }}
              type="text"
              placeholder="Search by job title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  background: activeTab === tab ? "#2563EB" : "#FFFFFF",
                  color: activeTab === tab ? "#FFFFFF" : "#374151",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <p style={{ color: "#6B7280", textAlign: "center", padding: "2rem 0" }}>
            No applications match your search/filter.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {filtered.map((app) => (
              <div
                key={app.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #F3F4F6",
                  borderRadius: "10px",
                  padding: "1rem 1.2rem",
                  flexWrap: "wrap",
                  gap: "0.8rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "8px",
                      background: "#111827",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    {app.letter}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#111827", fontWeight: 600, fontSize: "0.95rem" }}>
                      {app.jobTitle}
                    </p>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.2rem" }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          color: "#6B7280",
                          fontSize: "0.8rem",
                        }}
                      >
                        <Building2 size={13} /> {app.company}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          color: "#6B7280",
                          fontSize: "0.8rem",
                        }}
                      >
                        <Calendar size={13} /> {app.dateApplied}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span
                    style={{
                      ...statusStyle(app.status),
                      padding: "0.3rem 0.8rem",
                      borderRadius: "9999px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {app.status}
                  </span>
                  <ExternalLink size={16} color="#9CA3AF" style={{ cursor: "pointer" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}