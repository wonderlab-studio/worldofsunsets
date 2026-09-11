"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PendingSunset } from "@/lib/types";
import styles from "./ModerationList.module.css";

export default function ModerationList() {
  const router = useRouter();
  const [items, setItems] = useState<PendingSunset[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/sunsets").then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) {
        router.refresh();
        return;
      }
      if (res.ok) setItems(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const act = async (id: string, action: "approve" | "decline") => {
    setBusyId(id);
    const res = await fetch(`/api/admin/sunsets/${id}/${action}`, { method: "POST" });
    if (res.ok) {
      setItems((prev) => prev?.filter((s) => s.id !== id) ?? null);
    }
    setBusyId(null);
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  const resetAll = async () => {
    if (
      !window.confirm(
        "Удалить ВСЕ фото, включая уже одобренные? Это действие необратимо."
      )
    ) {
      return;
    }
    setResetting(true);
    const res = await fetch("/api/admin/reset", { method: "POST" });
    if (res.ok) setItems([]);
    setResetting(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Moderation ({items?.length ?? "…"})</h1>
        <div className={styles.headerActions}>
          <button className={styles.resetBtn} onClick={resetAll} disabled={resetting}>
            {resetting ? "Обнуление…" : "Обнулить всё"}
          </button>
          <button className={styles.logoutBtn} onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {items && items.length === 0 && <p className={styles.empty}>Nothing pending.</p>}

      <div className={styles.grid}>
        {items?.map((s) => (
          <div key={s.id} className={styles.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.thumbUrl} alt="" className={styles.thumb} />
            <div className={styles.meta}>
              <div>{new Date(s.takenAt).toLocaleString()}</div>
              <div>
                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
              </div>
              {s.placeName && <div>{s.placeName}</div>}
            </div>
            <div className={styles.actions}>
              <button
                className={styles.allow}
                disabled={busyId === s.id}
                onClick={() => act(s.id, "approve")}
              >
                Allow
              </button>
              <button
                className={styles.decline}
                disabled={busyId === s.id}
                onClick={() => act(s.id, "decline")}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
