"use client";

import { useEffect, useState } from "react";
import { SunsetDetail } from "@/lib/types";
import styles from "./PhotoModal.module.css";

export default function PhotoModal({
  sunsetId,
  onClose,
}: {
  sunsetId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SunsetDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sunsets/${sunsetId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sunsetId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <button className={styles.close} onClick={onClose} aria-label="Close">
        &times;
      </button>
      {error && <div className={styles.message}>Photo not found.</div>}
      {!error && !detail && <div className={styles.message}>Loading…</div>}
      {detail && (
        <div className={styles.content} onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.image} src={detail.imageUrl} alt="Sunset" />
          <div className={styles.info}>
            <div>{new Date(detail.takenAt).toLocaleString()}</div>
            {detail.placeName && <div>{detail.placeName}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
