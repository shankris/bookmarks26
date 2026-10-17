/* src/components/StarRating/StarRating.jsx */

"use client";

import { useId, useState } from "react";
import styles from "./StarRating.module.css";

/* --------------------------------------------------
   Default Rating Labels
-------------------------------------------------- */

const DEFAULT_RATINGS = ["Terrible", "Bad", "OK", "Good", "Excellent"];

/* --------------------------------------------------
   Star Rating Component
-------------------------------------------------- */

export default function StarRating({ ratings = DEFAULT_RATINGS, value = 0, onChange = () => {}, size = 32, name = "rating", disabled = false }) {
  const generatedId = useId();
  const [hoverRating, setHoverRating] = useState(0);
  const labels = Array.isArray(ratings) && ratings.length === 5 ? ratings : DEFAULT_RATINGS;
  const numericValue = Number(value);
  const selectedRating = Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 5 ? numericValue : 0;
  const displayedRating = hoverRating || selectedRating;

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <div className={styles.rating}>
      <div
        className={styles.stars}
        role='radiogroup'
        aria-label='Rate this item'
        aria-disabled={disabled}
        onMouseLeave={() => setHoverRating(0)}
      >
        {labels.map((label, index) => {
          const ratingValue = index + 1;
          const inputId = `${generatedId}-rating-${ratingValue}`;

          return (
            <label
              key={inputId}
              htmlFor={inputId}
              className={styles.label}
              onMouseEnter={() => {
                if (!disabled) {
                  setHoverRating(ratingValue);
                }
              }}
              title={label}
            >
              <input
                id={inputId}
                className={styles.input}
                type='radio'
                name={`${name}-${generatedId}`}
                value={ratingValue}
                checked={selectedRating === ratingValue}
                onChange={() => onChange(ratingValue)}
                disabled={disabled}
                aria-label={`${ratingValue} ${ratingValue === 1 ? "star" : "stars"} — ${label}`}
              />

              <svg
                className={styles.star}
                width={size}
                height={size}
                viewBox='0 0 32 32'
                aria-hidden='true'
                focusable='false'
              >
                <polygon
                  points='16,2 20.4,11 30,12.5 23,19.3 24.7,29 16,24.4 7.3,29 9,19.3 2,12.5 11.6,11'
                  fill={ratingValue <= displayedRating ? "var(--yellow, #f4a825)" : "transparent"}
                  stroke={ratingValue <= displayedRating ? "var(--yellow, #f4a825)" : "#c7cad1"}
                  strokeWidth='1.8'
                  strokeLinejoin='round'
                />
              </svg>
            </label>
          );
        })}
      </div>

      <div className={styles.descriptionRow}>
        <p
          className={styles.display}
          aria-live='polite'
          aria-atomic='true'
        >
          {displayedRating > 0 ? labels[displayedRating - 1] : ""}
        </p>
      </div>
    </div>
  );
}
