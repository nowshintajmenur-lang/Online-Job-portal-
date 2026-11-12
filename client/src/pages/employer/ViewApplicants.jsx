
import { useState, useEffect } from "react";
import { apiFetch } from "../../api";
import PageHeader from "../../components/Admin/PageHeader";
import AdminToolbar from "../../components/Admin/AdminToolbar";
import StatusBadge from "../../components/Admin/StatusBadge";
import Avatar from "../../components/Admin/Avatar";
import { th, td } from "../../components/Admin/styles";
import { applicationStatuses } from "../../data/EmployerData";
import { BriefcaseIcon, ClockIcon } from "../../components/Admin/icons";

export default function ViewApplicants() {
  const [applicants, setApplicants] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/applications/employer")
      .then((rows) =>
        setApplicants(
          rows
            .filter((r) => r.job && r.applicant)
            .map((r) => ({
              id: r._id,
              name: r.applicant.name || r.applicant.email,
              job: r.job.title,
              applied: new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
              status: r.status,
            }))
        )
      )
      .catch((e) => setError(e.message));
  }, []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [job, setJob] = useState("All");

  const visible = applicants.filter(
    (a) =>
      (status === "All" || a.status === status) &&
      (job === "All" || a.job === job) &&
      (a.name + a.job).toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = async (id, next) => {
    try {
      await apiFetch("/api/applications/" + id, { method: "PATCH", body: { status: next } });
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
    } catch (e) {
      setError(e.message);
    }
  };

  const jobTitles = [...new Set(applicants.map((a) => a.job))];

  return (
    <>
      <PageHeader title="View applicants" subtitle="Review candidates and move them through your hiring stages." />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search by applicant or job"
          filters={[
            { label: "jobs", value: job, onChange: setJob, options: ["All", ...jobTitles] },
            { label: "statuses", value: status, onChange: setStatus, options: ["All", ...applicationStatuses] },
          ]}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className={th}>Applicant</th>
                <th className={th}>Job</th>
                <th className={th}>Applied</th>
                <th className={th}>Status</th>
                <th className={th + " text-right"}>Update</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 transition-colors hover:bg-mist">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} />
                      <p className="font-medium text-ink">{a.name}</p>
                    </div>
                  </td>
                  <td className={td + " text-slate-600"}>
                    <span className="flex items-center gap-1.5">
                      <BriefcaseIcon className="h-3.5 w-3.5 text-slate-400" />
                      {a.job}
                    </span>
                  </td>
                  <td className={td + " text-slate-600"}>
                    <span className="flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                      {a.applied}
                    </span>
                  </td>
                  <td className={td}><StatusBadge status={a.status} /></td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <select
                        value=""
                        onChange={(e) => updateStatus(a.id, e.target.value)}
                        aria-label={`Update status for ${a.name}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-accent focus:border-accent focus:outline-none"
                      >
                        <option value="" disabled>Change status…</option>
                        {applicationStatuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 h-8 w-8 text-slate-300">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    No applicants match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Showing {visible.length} of {applicants.length} applicants
        </p>
      </div>
    </>
  );
}