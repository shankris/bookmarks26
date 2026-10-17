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
  const [animationFrom, setAnimationFrom] = useState(0);
  const [animationRating, setAnimationRating] = useState(0);
  const [animationVersion, setAnimationVersion] = useState(0);

  /* --------------------------------------------------
     Validate Rating Values
  -------------------------------------------------- */

  const labels = Array.isArray(ratings) && ratings.length === 5 ? ratings : DEFAULT_RATINGS;

  const numericValue = Number(value);

  const selectedRating = Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 5 ? numericValue : 0;

  /* --------------------------------------------------
     Handle Rating Selection
  -------------------------------------------------- */

  function handleRatingChange(nextRating) {
    if (disabled) return;

    setAnimationFrom(selectedRating);
    setAnimationRating(nextRating);
    setAnimationVersion((current) => current + 1);

    onChange(nextRating);
  }

  /* --------------------------------------------------
     Render Component
  -------------------------------------------------- */

  return (
    <div className={styles.rating}>
      {/* ----------------------------------------------
         Stars Row
      ---------------------------------------------- */}

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

          const isSelected = ratingValue <= selectedRating;
          const isHovered = hoverRating > 0 && ratingValue <= hoverRating;

          const shouldAnimate = animationVersion > 0 && ratingValue <= animationRating;

          /* Match the original stagger calculation. */

          const delayIndex = shouldAnimate && ratingValue > animationFrom + 1 ? ratingValue - animationFrom - 1 : 0;

          const delayClass = delayIndex >= 1 && delayIndex <= 4 ? styles[`delay${delayIndex}`] : "";

          const labelClassName = [styles.label, isSelected ? styles.selected : "", isHovered ? styles.hovered : "", shouldAnimate ? styles.animate : "", delayClass].filter(Boolean).join(" ");

          return (
            <label
              key={inputId}
              htmlFor={inputId}
              className={labelClassName}
              title={label}
              onMouseEnter={() => {
                if (!disabled) {
                  setHoverRating(ratingValue);
                }
              }}
            >
              <input
                id={inputId}
                className={styles.input}
                type='radio'
                name={`${name}-${generatedId}`}
                value={ratingValue}
                checked={selectedRating === ratingValue}
                onChange={() => handleRatingChange(ratingValue)}
                disabled={disabled}
                aria-label={`${ratingValue} ${ratingValue === 1 ? "star" : "stars"} — ${label}`}
              />

              <svg
                key={`${inputId}-${animationVersion}`}
                className={styles.star}
                width={size}
                height={size}
                viewBox='0 0 32 32'
                aria-hidden='true'
                focusable='false'
              >
                {/* Expanding Ring */}

                <g transform='translate(16,16)'>
                  <circle
                    className={styles.starRing}
                    fill='none'
                    stroke='#000'
                    strokeWidth='16'
                    r='8'
                    transform='scale(0)'
                  />
                </g>

                {/* Star Outline and Fill */}

                <g
                  stroke='#000'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <g transform='translate(16,16) rotate(180)'>
                    <polygon
                      className={styles.starStroke}
                      points='0,15 4.41,6.07 14.27,4.64 7.13,-2.32 8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 -14.27,4.64 -4.41,6.07'
                      fill='none'
                    />

                    <polygon
                      className={styles.starFill}
                      points='0,15 4.41,6.07 14.27,4.64 7.13,-2.32 8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 -14.27,4.64 -4.41,6.07'
                      fill='#000'
                    />
                  </g>

                  {/* Five Animated Rays */}

                  <g
                    transform='translate(16,16)'
                    strokeDasharray='12 12'
                    strokeDashoffset='12'
                  >
                    {[0, 72, 144, 216, 288].map((rotation) => (
                      <polyline
                        key={rotation}
                        className={styles.starLine}
                        transform={`rotate(${rotation})`}
                        points='0 4,0 16'
                      />
                    ))}
                  </g>
                </g>
              </svg>
            </label>
          );
        })}
      </div>

      {/* ----------------------------------------------
         Rating Description Row
      ---------------------------------------------- */}

      <div className={styles.descriptionRow}>
        <p
          className={styles.display}
          aria-live='polite'
          aria-atomic='true'
        >
          {labels[selectedRating - 1] || ""}
        </p>
      </div>
    </div>
  );
}
