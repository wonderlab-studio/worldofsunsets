"use client";

import { FormEvent, useState } from "react";
import MiniLocationPicker from "./MiniLocationPicker";
import styles from "./AddSunsetForm.module.css";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AddSunsetForm({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  // Default to Paris; MiniLocationPicker tries geolocation on mount and
  // silently keeps this default if that fails or is denied.
  const [file, setFile] = useState<File | null>(null);
  const [takenAtInput, setTakenAtInput] = useState(() => toLocalInputValue(new Date()));
  const [lat, setLat] = useState(48.8566);
  const [lng, setLng] = useState(2.3522);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a photo.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const takenAt = new Date(takenAtInput);
    const form = new FormData();
    form.set("image", file);
    form.set("takenAt", takenAt.toISOString());
    form.set("lat", String(lat));
    form.set("lng", String(lng));

    try {
      const res = await fetch("/api/sunsets", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close">
          &times;
        </button>

        {done ? (
          <div className={styles.doneMessage}>
            <h2>Thanks!</h2>
            <p>Your sunset was submitted and is awaiting moderation.</p>
            <button className={styles.primaryBtn} onClick={onSubmitted}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>Add sunset</h2>

            <label className={styles.field}>
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </label>

            <label className={styles.field}>
              <span>When</span>
              <input
                type="datetime-local"
                value={takenAtInput}
                onChange={(e) => setTakenAtInput(e.target.value)}
                required
              />
            </label>

            <div className={styles.field}>
              <span>Where</span>
              <MiniLocationPicker
                lat={lat}
                lng={lng}
                onChange={(la, ln) => {
                  setLat(la);
                  setLng(ln);
                }}
              />
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <button className={styles.primaryBtn} type="submit" disabled={submitting}>
              {submitting ? "Uploading…" : "DONE"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
