import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../Context/AuthContext";
import { apiFetch } from "../api";

export default function Register() {
  const [role, setRole] = useState("seeker");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      // Save the profile (name + role) in our database
      const { user } = await apiFetch("/api/auth/sync", {
        method: "POST",
        body: { name: name.trim(), role },
      });
      login({ name: user.name, email: user.email, role: user.role });
      navigate(user.role === "employer" ? "/employer" : "/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("This email is already used.");
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else if (err.code) setError("Could not create the account. Check the details.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate min-h-[calc(100vh-73px)] overflow-hidden bg-gradient-to-br from-mist via-blue-50 to-indigo-100">
      {/* Background blobs (what the glass blurs) */}
      <div className="animate-float pointer-events-none absolute top-16 left-[8%] -z-10 h-80 w-80 rounded-full bg-accent/60 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute bottom-10 left-[22%] -z-10 h-72 w-72 rounded-full bg-cyan-400/50 blur-3xl" />
      <div className="animate-float pointer-events-none absolute top-1/4 left-[30%] -z-10 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute top-1/3 right-[5%] -z-10 h-[26rem] w-[26rem] rounded-full bg-indigo-400/40 blur-3xl" />

      <div className="mx-auto grid max-w-5xl items-stretch gap-10 px-6 py-16 md:grid-cols-2">
        {/* Branding panel (live dark glass) */}
        <div className="relative hidden h-full flex-col justify-center overflow-hidden rounded-3xl border border-white/25 bg-navy/70 p-10 text-white shadow-2xl shadow-accent/20 backdrop-blur-2xl backdrop-saturate-150 md:flex">
          {/* Moving lights inside the glass */}
          <div className="animate-float pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent/60 blur-3xl" />
          <div className="animate-float-slow pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-400/40 blur-3xl" />
          {/* Glossy top-left highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          {/* Light streak sweeping across */}
          <div className="animate-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="relative">
            <span className="font-display text-2xl font-semibold">
              Job<span className="text-blue-300">Hub</span>
            </span>
            <h2 className="mt-6 font-display text-2xl font-semibold leading-snug">
              Real openings, real applicants, no noise.
            </h2>
            <p className="mt-4 text-sm text-slate-200">
              Join thousands of job seekers and employers already using JobHub
              to hire and get hired faster.
            </p>

            <div className="mt-10 space-y-3">
              <div className="animate-bob rounded-xl border border-white/30 bg-white/15 p-4 shadow-lg backdrop-blur-lg transition-colors hover:bg-white/25">
                <p className="font-display text-xl font-semibold">12,400+</p>
                <p className="flex items-center gap-2 text-sm text-slate-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  </span>
                  Open roles right now
                </p>
              </div>
              <div
                className="animate-bob rounded-xl border border-white/30 bg-white/15 p-4 shadow-lg backdrop-blur-lg transition-colors hover:bg-white/25"
                style={{ animationDelay: "1.4s" }}
              >
                <p className="font-display text-xl font-semibold">89%</p>
                <p className="text-sm text-slate-200">Applied within a week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form panel (frosted glass) */}
        <div className="flex h-full flex-col justify-center rounded-3xl border border-white/60 bg-white/40 p-8 shadow-xl shadow-accent/10 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-accent/20">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Join JobHub as a job seeker or an employer.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-white/70 bg-white/50 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setRole("seeker")}
              className={
                "rounded-md py-2 text-sm font-medium transition-all " +
                (role === "seeker"
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-ink")
              }
            >
              Job Seeker
            </button>
            <button
              type="button"
              onClick={() => setRole("employer")}
              className={
                "rounded-md py-2 text-sm font-medium transition-all " +
                (role === "employer"
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-ink")
              }
            >
              Employer
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-ink">
                {role === "seeker" ? "Full name" : "Company name"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "seeker" ? "Jane Doe" : "Acme Inc."}
                className="mt-1 w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm text-ink placeholder:text-slate-400 transition-all focus:border-accent focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm text-ink placeholder:text-slate-400 transition-all focus:border-accent focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm text-ink placeholder:text-slate-400 transition-all focus:border-accent focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-lg active:translate-y-0"
            >
              Create {role === "seeker" ? "seeker" : "employer"} account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}