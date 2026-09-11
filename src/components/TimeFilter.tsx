"use client";

import { TimeWindow } from "@/lib/types";
import styles from "./TimeFilter.module.css";

const OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "anytime", label: "Anytime" },
];

export default function TimeFilter({
  value,
  onChange,
}: {
  value: TimeWindow;
  onChange: (w: TimeWindow) => void;
}) {
  return (
    <div className={styles.bar}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.btn} ${value === opt.value ? styles.active : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
