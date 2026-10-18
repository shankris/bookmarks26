/* src/components/TagInput/TagInput.jsx */

"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import styles from "./TagInput.module.css";

/* --------------------------------------------------
Keyword Helpers
-------------------------------------------------- */

const MAX_TAGS = 10;

const STOP_WORDS = new Set(["about", "after", "also", "been", "being", "between", "both", "could", "does", "each", "from", "have", "here", "into", "just", "more", "most", "much", "over", "same", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "very", "what", "when", "where", "which", "while", "with", "would", "your", "will", "were", "was", "are", "and", "but", "for", "not", "the", "you", "our", "out", "all", "any", "can", "has", "had", "how", "its", "may", "new", "now", "off", "one", "use", "using", "get", "web", "website", "home", "official", "welcome", "page", "click", "learn", "read", "explore"]);

function normalizeTag(value) {
  return value.trim().replace(/\s+/g, " ");
}

function getTagKey(value) {
  return normalizeTag(value).toLowerCase();
}

/* --------------------------------------------------
Generate Tags From Website Metadata
-------------------------------------------------- */

export function generateTagsFromMetadata(title = "", description = "") {
  const candidates = [];

  function addCandidate(value) {
    const tag = normalizeTag(value);
    const key = getTagKey(tag);

    if (!tag || tag.length < 2 || tag.length > 40 || STOP_WORDS.has(key) || candidates.some((item) => getTagKey(item) === key)) {
      return;
    }

    candidates.push(tag);
  }

  // The title has priority over the description.
  const cleanTitle = title.replace(/\s*[|–—-]\s*.*$/, "").replace(/[^\p{L}\p{N}\s+#.-]/gu, " ");

  if (cleanTitle.trim()) {
    addCandidate(cleanTitle);

    cleanTitle
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => {
        if (word.length >= 2 && !STOP_WORDS.has(word.toLowerCase())) {
          addCandidate(word.replace(/^[.+#]+|[.+#]+$/g, ""));
        }
      });
  }

  const words = `${title} ${description}`.replace(/https?:\/\/\S+/gi, " ").match(/[\p{L}\p{N}+#.-]+/gu) || [];

  const meaningfulWords = words
    .map((word) => word.replace(/^[.+#-]+|[.+#-]+$/g, ""))
    .filter((word) => {
      const key = word.toLowerCase();

      return word.length >= 2 && !STOP_WORDS.has(key) && !/^\d+$/.test(word);
    });

  // Prefer useful two-word phrases from the metadata.
  for (let index = 0; index < meaningfulWords.length - 1; index += 1) {
    const first = meaningfulWords[index];
    const second = meaningfulWords[index + 1];

    if (first.length >= 2 && second.length >= 2 && first.length + second.length <= 28) {
      addCandidate(`${first} ${second}`);
    }

    if (candidates.length >= MAX_TAGS * 2) {
      break;
    }
  }

  // Then use individual meaningful words.
  meaningfulWords.forEach((word) => {
    addCandidate(word);
  });

  return candidates.slice(0, MAX_TAGS);
}

/* --------------------------------------------------
Tag Input Component
-------------------------------------------------- */

export default function TagInput({ value = [], onChange, sourceTitle = "", sourceDescription = "", maxTags = MAX_TAGS, label = "Tags" }) {
  const [inputValue, setInputValue] = useState("");
  const lastSource = useRef(null);

  const tags = Array.isArray(value) ? value : [];
  const limit = Math.max(1, maxTags);
  const atLimit = tags.length >= limit;

  /* --------------------------------------------------
  Populate Tags When Website Metadata Changes
  -------------------------------------------------- */

  useEffect(() => {
    const sourceKey = JSON.stringify([sourceTitle, sourceDescription]);

    if (lastSource.current === sourceKey) {
      return;
    }

    lastSource.current = sourceKey;

    // Empty metadata means the website was cleared or changed.
    if (!sourceTitle.trim() && !sourceDescription.trim()) {
      onChange([]);
      setInputValue("");
      return;
    }

    const generated = generateTagsFromMetadata(sourceTitle, sourceDescription).slice(0, limit);

    onChange(generated);
    setInputValue("");
  }, [sourceTitle, sourceDescription, limit, onChange]);

  /* --------------------------------------------------
  Add Tag
  -------------------------------------------------- */

  function addTag(valueToAdd) {
    const tag = normalizeTag(valueToAdd);

    if (!tag || atLimit) {
      return;
    }

    const exists = tags.some((item) => getTagKey(item) === getTagKey(tag));

    if (exists) {
      setInputValue("");
      return;
    }

    onChange([...tags, tag].slice(0, limit));
    setInputValue("");
  }

  /* --------------------------------------------------
  Remove Tag
  -------------------------------------------------- */

  function removeTag(tagToRemove) {
    onChange(tags.filter((tag) => getTagKey(tag) !== getTagKey(tagToRemove)));
  }

  /* --------------------------------------------------
  Suggestions
  -------------------------------------------------- */

  const suggestions = generateTagsFromMetadata(sourceTitle, sourceDescription).filter((suggestion) => !tags.some((tag) => getTagKey(tag) === getTagKey(suggestion)) && (!inputValue.trim() || suggestion.toLowerCase().includes(inputValue.trim().toLowerCase())));

  const customTagExists = tags.some((tag) => getTagKey(tag) === getTagKey(inputValue));

  /* --------------------------------------------------
  Render
  -------------------------------------------------- */

  return (
    <div className={styles.tagInput}>
      <div className={styles.tagHeader}>
        <span className={styles.tagLabel}>{label}</span>
        <span className={styles.tagCount}>
          {tags.length} / {limit}
        </span>
      </div>

      {/* Selected Tags */}

      {tags.length > 0 && (
        <div className={styles.tagList}>
          {tags.map((tag) => (
            <span
              className={styles.tagChip}
              key={getTagKey(tag)}
            >
              <span className={styles.tagText}>{tag}</span>

              <button
                type='button'
                className={styles.tagRemove}
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                title={`Remove ${tag}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom Tag Input */}

      <div className={styles.tagEntry}>
        <input
          type='text'
          value={inputValue}
          disabled={atLimit}
          placeholder={atLimit ? "Maximum of 10 tags reached" : "Type a tag and press Enter"}
          aria-label='Add a tag'
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(inputValue);
            }
          }}
        />

        <button
          type='button'
          className={styles.tagAddButton}
          disabled={atLimit || !inputValue.trim() || customTagExists}
          onClick={() => addTag(inputValue)}
          aria-label='Add tag'
          title='Add tag'
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Metadata Suggestions */}

      {!atLimit && suggestions.length > 0 && (
        <div className={styles.tagSuggestions}>
          <span className={styles.suggestionLabel}>Suggestions</span>

          <div className={styles.suggestionList}>
            {suggestions
              .filter((suggestion) => !inputValue.trim() || suggestion.toLowerCase().includes(inputValue.trim().toLowerCase()))
              .slice(0, 5)
              .map((suggestion) => (
                <button
                  type='button'
                  key={getTagKey(suggestion)}
                  className={styles.suggestionButton}
                  onClick={() => addTag(suggestion)}
                  title={`Add ${suggestion}`}
                >
                  <Plus size={13} />
                  {suggestion}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
