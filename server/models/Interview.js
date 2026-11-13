import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledAt: { type: Date, required: true },
    durationMin: { type: Number, default: 30 },
    meetingUrl: { type: String, required: true }, // live video room
    note: { type: String, default: "" },
    status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
  },
  { timestamps: true }
);

export default mongoose.model("Interview", interviewSchema);
