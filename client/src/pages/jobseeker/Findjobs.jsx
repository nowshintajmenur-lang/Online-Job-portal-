import { useState, useEffect } from "react";
import { Search, MapPin, Heart, Loader2, ExternalLink } from "lucide-react";
import { getSavedJobs, toggleSavedJob } from "../../utils/savedJobs";
import { API_URL, apiFetch } from "../../api";

const MOCK_JOBS = [
  {
    id: "mock-1",
    title: "Frontend Developer",
    company: "Tech Innovate Ltd",
    location: "Chattogram, Bangladesh",
    type: "Full Time",
    salary: "TK 25,000 - 40,000/month",
    letter: "T",
    tags: ["React", "JavaScript", "CSS"],
    isReal: false,
  },
  {
    id: "mock-2",
    title: "Web Developer (MERN Stack)",
    company: "SoftTech Solutions",
    location: "Dhaka, Bangladesh",
    type: "Full Time",
    salary: "TK 30,000 - 45,000/month",
    letter: "S",
    tags: ["MongoDB", "Express", "React", "Node"],
    isReal: false,
  },
  {
    id: "mock-3",
    title: "Junior Software Engineer",
    company: "Global IT Limited",
    location: "Chattogram, Bangladesh",
    type: "Internship",
    salary: "TK 15,000 - 20,000/month",
    letter: "G",
    tags: ["Java", "SQL"],
    isReal: false,
  },
  {
    id: "mock-4",
    title: "UI/UX Designer",
    company: "NexGen Digital",
    location: "Dhaka, Bangladesh",
    type: "Part Time",
    salary: "TK 20,000 - 30,000/month",
    letter: "N",
    tags: ["Figma", "Adobe XD"],
    isReal: false,
  },
  {
    id: "mock-5",
    title: "Backend Engineer (Node.js)",
    company: "CloudNine",
    location: "Remote",
    type: "Full Time",
    salary: "TK 35,000 - 50,000/month",
    letter: "C",
    tags: ["Node.js", "MongoDB", "AWS"],
    isReal: false,
  },
  {
    id: "mock-6",
    title: "Data Analyst Intern",
    company: "Insight Analytics",
    location: "Chattogram, Bangladesh",
    type: "Internship",
    salary: "TK 10,000 - 15,000/month",
    letter: "I",
    tags: ["Excel", "Python", "SQL"],
    isReal: false,
  },
];

const JOB_TYPES = ["All Types", "Full Time", "Part Time", "Internship"];
const LOCATIONS = ["All Locations", "Chattogram, Bangladesh", "Dhaka, Bangladesh", "Remote"];

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

function normalizeType(jobType) {
  if (!jobType) return "Full Time";
  const t = jobType.toLowerCase();
  if (t.includes("part")) return "Part Time";
  if (t.includes("intern")) return "Internship";
  return "Full Time";
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

export default function FindJobs() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [savedIds, setSavedIds] = useState(() => getSavedJobs().map((j) => j.id));
  const [appliedIds, setAppliedIds] = useState([]);
  const [notice, setNotice] = useState("");

  // Load what this seeker already applied to / saved (database jobs only)
  useEffect(() => {
    async function loadMine() {
      try {
        const apps = await apiFetch("/api/applications/mine");
        setAppliedIds(apps.filter((a) => a.job).map((a) => `db-${a.job._id}`));
        const saved = await apiFetch("/api/saved");
        const ids = saved.map((s) => `db-${s.job._id}`);
        setSavedIds((prev) => [...new Set([...prev, ...ids])]);
      } catch (err) {
        // not logged in as a seeker: ignore
      }
    }
    loadMine();
  }, []);

  const [apiJobs, setApiJobs] = useState([]);
  const [dbJobs, setDbJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRealJobs() {
      try {
        setLoading(true);

        const res = await fetch("https://remotive.com/api/remote-jobs?limit=60");
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        const allRawJobs = data.jobs || [];

        // Group jobs by their category so we can pick a few from each,
        // instead of ending up with only software/CSE-heavy results.
        const byCategory = {};
        allRawJobs.forEach((job) => {
          const cat = job.category || "Other";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(job);
        });

        const diversified = Object.values(byCategory).flatMap((jobsInCat) =>
          jobsInCat.slice(0, 3)
        );

        const mapped = diversified.map((job) => ({
          id: `api-${job.id}`,
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || "Remote",
          type: normalizeType(job.job_type),
          salary: job.salary && job.salary.trim() ? job.salary : "Not specified",
          letter: job.company_name ? job.company_name.charAt(0).toUpperCase() : "?",
          tags: [job.category, ...(job.tags || [])].filter(Boolean).slice(0, 3),
          isReal: true,
          applyUrl: job.url,
          description: stripHtml(job.description).slice(0, 140),
        }));

        const shuffled = mapped.sort(() => Math.random() - 0.5);

        setApiJobs(shuffled);
        setError(
          shuffled.length === 0
            ? "Could not load live jobs right now. Showing sample jobs only."
            : null
        );
      } catch (err) {
        console.error(err);
        setError("Could not load live jobs right now. Showing sample jobs only.");
      } finally {
        setLoading(false);
      }
    }

    fetchRealJobs();
  }, []);

  // Jobs saved in our own MongoDB. Checked again every 5 seconds.
  useEffect(() => {
    let stop = false;
    const typeMap = { "Full-time": "Full Time", "Part-time": "Part Time" };

    async function loadDbJobs() {
      try {
        const res = await fetch(`${API_URL}/api/jobs`);
        if (!res.ok) return;
        const data = await res.json();
        if (stop) return;
        setDbJobs(
          data.map((j) => ({
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
            description: j.description,
          }))
        );
      } catch (err) {
        // server not running: just show the other jobs
      }
    }

    loadDbJobs();
    const timer = setInterval(loadDbJobs, 5000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const ALL_JOBS = [...dbJobs, ...apiJobs, ...MOCK_JOBS];

  const filtered = ALL_JOBS.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All Types" || job.type === typeFilter;
    const matchesLocation =
      locationFilter === "All Locations" ||
      job.location === locationFilter ||
      (locationFilter === "Remote" && job.location.toLowerCase().includes("remote"));
    return matchesSearch && matchesType && matchesLocation;
  });

  async function toggleSave(job) {
    const wasSaved = savedIds.includes(job.id);
    if (job.id.startsWith("db-")) {
      try {
        const realId = job.id.slice(3);
        await apiFetch("/api/saved/" + realId, { method: wasSaved ? "DELETE" : "POST" });
      } catch (err) {
        setNotice(err.message);
        return;
      }
    } else {
      toggleSavedJob(job);
    }
    setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== job.id) : [...prev, job.id]));
  }

  async function handleApply(job) {
    if (job.isReal && job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (appliedIds.includes(job.id)) return;
    if (job.id.startsWith("db-")) {
      try {
        await apiFetch("/api/applications", { method: "POST", body: { jobId: job.id.slice(3) } });
        setNotice("Application sent!");
      } catch (err) {
        if (!/already/i.test(err.message)) {
          setNotice(err.message);
          return;
        }
      }
    }
    setAppliedIds((prev) => [...prev, job.id]);
  }

  const selectStyle = {
    width: "100%",
    padding: "0.75rem 0.9rem",
    borderRadius: "10px",
    border: "1.5px solid #E5E7EB",
    fontSize: "0.87rem",
    color: "#374151",
    background: "#F9FAFB",
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const filterLabelStyle = {
    display: "block",
    marginBottom: "0.45rem",
    color: "#374151",
    fontSize: "0.8rem",
    fontWeight: 600,
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#111827", marginBottom: "0.3rem", fontSize: "1.7rem" }}>Find Jobs</h1>
      <p style={{ color: "#6B7280", marginBottom: "1.75rem" }}>
        Browse and apply to jobs that match your skills. Live listings are pulled from real
        companies hiring right now, alongside sample jobs.
      </p>

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "16px",
          padding: "1.75rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px" }}>
            <label style={filterLabelStyle}>Keyword</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                border: "1.5px solid #E5E7EB",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                background: "#F9FAFB",
              }}
            >
              <Search size={17} color="#9CA3AF" />
              <input
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "0.9rem",
                  width: "100%",
                  background: "transparent",
                }}
                type="text"
                placeholder="Job title or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: "1 1 180px" }}>
            <label style={filterLabelStyle}>Job Type</label>
            <select
              style={selectStyle}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={filterLabelStyle}>Location</label>
            <select
              style={selectStyle}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 1.6rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              height: "44px",
            }}
          >
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            color: "#6B7280",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Loading live job listings...
        </div>
      )}
      {notice && (
        <p style={{ color: "#2563EB", fontSize: "0.85rem", marginBottom: "1rem" }}>{notice}</p>
      )}
      {error && (
        <p style={{ color: "#B45309", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
      )}

      <p style={{ color: "#6B7280", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Showing {filtered.length} of {ALL_JOBS.length} jobs
        {apiJobs.length > 0 && ` (including ${apiJobs.length} live listings)`}
      </p>

      {filtered.length === 0 && !loading ? (
        <p style={{ color: "#6B7280", textAlign: "center", padding: "3rem 0" }}>
          No jobs match your search/filter.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filtered.map((job) => {
            const isSaved = savedIds.includes(job.id);
            const isApplied = appliedIds.includes(job.id);

            return (
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
                    onClick={() => toggleSave(job)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.3rem",
                    }}
                  >
                    <Heart
                      size={20}
                      color={isSaved ? "#DB2777" : "#9CA3AF"}
                      fill={isSaved ? "#DB2777" : "none"}
                    />
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
                    disabled={!job.isReal && isApplied}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background: !job.isReal && isApplied ? "#D1FAE5" : "#2563EB",
                      color: !job.isReal && isApplied ? "#047857" : "#FFFFFF",
                      border: "none",
                      padding: "0.55rem 1.2rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: !job.isReal && isApplied ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {job.isReal ? (
                      <>
                        Apply Now <ExternalLink size={13} />
                      </>
                    ) : isApplied ? (
                      "Applied"
                    ) : (
                      "Apply Now"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}