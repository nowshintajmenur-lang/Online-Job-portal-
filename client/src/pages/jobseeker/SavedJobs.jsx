import { useState, useEffect } from "react";
import { Heart, MapPin, ExternalLink, HeartOff } from "lucide-react";
import { getSavedJobs, removeJob } from "../../utils/savedJobs";
import { apiFetch } from "../../api";

function typeStyle(type) {
  switch (type) {
    case "Internship":
      return { background: "#FEF3C7", color: "#B45309" };
    case "Part Time":
      return { background: "#FCE7F3", color: "#BE185D" };
    default:
      return { background: "#D1FAE5", color: "#047857" };
  }
}

export default function SavedJobs() {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    const local = getSavedJobs();
    setSaved(local);
    const typeMap = { "Full-time": "Full Time", "Part-time": "Part Time" };
    apiFetch("/api/saved")
      .then((rows) => {
        const fromDb = rows.map(({ job: j }) => ({
          id: `db-${j._id}`,
          title: j.title,
          company: j.companyName || "Employer",
          location: j.location,
          type: typeMap[j.type] || j.type,
          salary:
            j.salaryMin || j.salaryMax
              ? `TK ${j.salaryMin || "?"} - ${j.salaryMax || "?"}/month`
              : "Not specified",
          letter: (j.companyName || "E").charAt(0).toUpperCase(),
          tags: [],
          isReal: false,
        }));
        setSaved([...fromDb, ...local.filter((l) => !String(l.id).startsWith("db-"))]);
      })
      .catch(() => {});
  }, []);

  async function handleRemove(id) {
    if (String(id).startsWith("db-")) {
      try {
        await apiFetch("/api/saved/" + id.slice(3), { method: "DELETE" });
      } catch (err) {
        alert(err.message);
        return;
      }
      setSaved((prev) => prev.filter((j) => j.id !== id));
      return;
    }
    removeJob(id);
    setSaved((prev) => prev.filter((j) => j.id !== id));
  }

  async function handleApply(job) {
    if (job.isReal && job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    } else if (String(job.id).startsWith("db-")) {
      try {
        await apiFetch("/api/applications", { method: "POST", body: { jobId: job.id.slice(3) } });
        alert(`Application sent for "${job.title}"!`);
      } catch (err) {
        alert(err.message);
      }
    } else {
      alert(`"${job.title}" is a demo job, so it cannot be applied here.`);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#111827", marginBottom: "0.3rem", fontSize: "1.7rem" }}>
        Saved Jobs
      </h1>
      <p style={{ color: "#6B7280", marginBottom: "1.75rem" }}>
        Jobs you've bookmarked from Find Jobs. You have {saved.length} saved job
        {saved.length !== 1 ? "s" : ""}.
      </p>

      {saved.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "14px",
            padding: "4rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#DBEAFE",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Heart size={28} />
          </div>
          <h2 style={{ color: "#111827", margin: "0 0 0.4rem", fontSize: "1.2rem" }}>
            No saved jobs yet
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.9rem", maxWidth: "360px", margin: "0 auto" }}>
            Go to <strong>Find Jobs</strong> and tap the heart icon on any job you like to save it here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {saved.map((job) => (
            <div
              key={job.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "14px",
                padding: "1.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
                position: "relative",
              }}
            >
              {job.isReal && (
                <span
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "3rem",
                    background: "#DCFCE7",
                    color: "#166534",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  LIVE
                </span>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "0.9rem" }}>
                  <div
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "10px",
                      background: "#111827",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {job.letter}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#111827", fontWeight: 700, fontSize: "1rem" }}>
                      {job.title}
                    </p>
                    <p style={{ margin: "0.2rem 0 0", color: "#6B7280", fontSize: "0.85rem" }}>
                      {job.company}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(job.id)}
                  title="Remove from saved"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.3rem",
                  }}
                >
                  <HeartOff size={20} color="#DB2777" />
                </button>
              </div>

              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    color: "#6B7280",
                    fontSize: "0.78rem",
                  }}
                >
                  <MapPin size={13} /> {job.location}
                </span>
                <span
                  style={{
                    ...typeStyle(job.type),
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                  }}
                >
                  {job.type}
                </span>
              </div>

              {job.description && (
                <p style={{ margin: 0, color: "#6B7280", fontSize: "0.78rem", lineHeight: 1.4 }}>
                  {job.description}...
                </p>
              )}

              {job.tags && job.tags.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#F3F4F6",
                        color: "#374151",
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "6px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.3rem",
                  paddingTop: "0.9rem",
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <span style={{ color: "#111827", fontWeight: 600, fontSize: "0.85rem" }}>
                  {job.salary}
                </span>
                <button
                  onClick={() => handleApply(job)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "0.55rem 1.2rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {job.isReal ? (
                    <>
                      Apply Now <ExternalLink size={13} />
                    </>
                  ) : (
                    "Apply Now"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}