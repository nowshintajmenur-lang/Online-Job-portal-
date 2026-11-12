import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/Admin/PageHeader";
import AdminToolbar from "../../components/Admin/AdminToolbar";
import StatusBadge from "../../components/Admin/StatusBadge";
import { btn, btnDanger, th, td } from "../../components/Admin/styles";
import { jobTypes } from "../../data/EmployerData";
import { apiFetch } from "../../api";
import { MapPinIcon, ClockIcon, BriefcaseIcon, UsersIcon } from "../../components/Admin/icons";

// "3d ago" style text from a date
function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function ManageJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load my jobs from the server
  useEffect(() => {
    apiFetch("/api/jobs/mine")
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");

  const visible = jobs.filter(
    (j) =>
      (status === "All" || j.status === status) &&
      (type === "All" || j.type === type) &&
      (j.title + j.location).toLowerCase().includes(search.toLowerCase())
  );

  // Close or reopen a job
  const toggle = async (job) => {
    setError("");
    try {
      const updated = await apiFetch(`/api/jobs/${job._id}`, {
        method: "PATCH",
        body: { status: job.status === "Open" ? "Closed" : "Open" },
      });
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status: updated.status } : j)));
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete a job
  const remove = async (id) => {
    if (!window.confirm("Remove this job posting? This cannot be undone.")) return;
    setError("");
    try {
      await apiFetch(`/api/jobs/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Manage jobs" subtitle="Close, reopen, or remove your job postings.">
        <Link to="/employer/jobs/new" className={btn}>
          + Post a job
        </Link>
      </PageHeader>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search by title or location"
          filters={[
            { label: "statuses", value: status, onChange: setStatus, options: ["All", "Open", "Closed"] },
            { label: "types", value: type, onChange: setType, options: ["All", ...jobTypes] },
          ]}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className={th}>Role</th>
                <th className={th}>Location</th>
                <th className={th}>Type</th>
                <th className={th}>Applicants</th>
                <th className={th}>Status</th>
                <th className={th + " text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr key={j._id} className="border-t border-slate-100 transition-colors hover:bg-mist">
                  <td className={td}>
                    <p className="font-medium text-ink">{j.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <ClockIcon className="h-3 w-3" />
                      Posted {timeAgo(j.createdAt)}
                    </p>
                  </td>
                  <td className={td + " text-slate-600"}>
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
                      {j.location}
                    </span>
                  </td>
                  <td className={td + " text-slate-600"}>
                    <span className="flex items-center gap-1.5">
                      <BriefcaseIcon className="h-3.5 w-3.5 text-slate-400" />
                      {j.type}
                    </span>
                  </td>
                  <td className={td + " text-slate-600"}>
                    <Link to="/employer/applicants" className="flex items-center gap-1.5 hover:text-accent hover:underline">
                      <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                      {j.applicants}
                    </Link>
                  </td>
                  <td className={td}><StatusBadge status={j.status} /></td>
                  <td className={td}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => toggle(j)} className={btn}>
                        {j.status === "Open" ? "Close" : "Reopen"}
                      </button>
                      <button onClick={() => remove(j._id)} className={btnDanger}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 h-8 w-8 text-slate-300">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    {loading ? "Loading..." : jobs.length === 0 ? "You have not posted any jobs yet." : "No jobs match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Showing {visible.length} of {jobs.length} jobs
        </p>
      </div>
    </>
  );
}