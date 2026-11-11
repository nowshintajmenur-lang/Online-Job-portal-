
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/Admin/PageHeader";
import { btn } from "../../components/Admin/styles";
import { jobTypes } from "../../data/EmployerData";
import { apiFetch } from "../../api";
import { useAuth } from "../../Context/AuthContext";

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function PostJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    type: jobTypes[0],
    location: "",
    salaryMin: "",
    salaryMax: "",
    description: "",
    requirements: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      await apiFetch("/api/jobs", {
        method: "POST",
        body: {
          title: form.title,
          type: form.type,
          location: form.location,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
          description: form.description,
          requirements: form.requirements,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setSaveError(err.message || "Could not save the job. Is the server running?");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">Job posted</h1>
        <p className="mt-2 text-sm text-slate-500">
          "{form.title}" is now live and visible to job seekers.
        </p>
        <button onClick={() => navigate("/employer/jobs")} className={btn + " mt-6"}>
          Go to Manage jobs
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Post a job" subtitle="Fill in the role details job seekers will see." />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Basics</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Job title
                <input required value={form.title} onChange={set("title")} placeholder="e.g. Senior Frontend Engineer" className={inputCls} />
              </label>
              <label className="block text-xs text-slate-500">
                Employment type
                <select value={form.type} onChange={set("type")} className={inputCls}>
                  {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Location
                <input required value={form.location} onChange={set("location")} placeholder="Remote, or city" className={inputCls} />
              </label>
              <label className="block text-xs text-slate-500">
                Salary min (৳)
                <input type="number" value={form.salaryMin} onChange={set("salaryMin")} className={inputCls} />
              </label>
              <label className="block text-xs text-slate-500">
                Salary max (৳)
                <input type="number" value={form.salaryMax} onChange={set("salaryMax")} className={inputCls} />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Description</h2>
            <textarea
              required
              value={form.description}
              onChange={set("description")}
              rows={5}
              placeholder="What will this person do day to day?"
              className={inputCls + " resize-none leading-relaxed"}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Requirements</h2>
            <textarea
              value={form.requirements}
              onChange={set("requirements")}
              rows={5}
              placeholder="Skills, experience, and qualifications"
              className={inputCls + " resize-none leading-relaxed"}
            />
          </section>
        </div>

        {/* Live preview */}
        <aside className="rounded-xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24 lg:h-fit">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Preview</p>
          <p className="mt-3 font-display text-lg font-semibold text-ink">{form.title || "Job title"}</p>
          <p className="text-sm text-slate-500">{form.location || "Location"} · {form.type}</p>
          {(form.salaryMin || form.salaryMax) && (
            <p className="mt-1 text-sm text-slate-500">৳{form.salaryMin || "?"} – ৳{form.salaryMax || "?"}</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {form.description || "Description will appear here."}
          </p>
          {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
          <button type="submit" disabled={saving} className={btn + " mt-6 w-full text-center"}>
            {saving ? "Saving..." : "Publish job"}
          </button>
        </aside>
      </form>
    </>
  );
}