/* src/components/BookmarkForm/BookmarkForm.jsx */

"use client";

import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Search, X, ChevronLeft, ChevronRight, Check, Globe } from "lucide-react";

import bookmarks from "@/data/bookmarks.json";
import StarRating from "@/components/StarRating/StarRating";
import bookmarkCategories from "@/data/bookmarkCategories.json";
import TagInput from "@/components/TagInput/TagInput";

import styles from "./BookmarkForm.module.css";

/* --------------------------------------------------
URL Helpers
-------------------------------------------------- */

/* src/components/BookmarkForm/BookmarkForm.jsx */

function normalizeUrl(value) {
  let input = value.trim();

  if (!input) {
    return "";
  }

  // Add a default domain ending only when none is provided.
  const withoutProtocol = input.replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, "");
  const hostname = withoutProtocol.split(/[/?#]/)[0];

  if (hostname && !hostname.includes(".") && hostname !== "localhost") {
    input = input.replace(hostname, `${hostname}.com`);
  }

  // Add HTTPS when the user has not specified a protocol.
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)) {
    input = `https://${input}`;
  }

  try {
    return new URL(input).toString();
  } catch {
    return "";
  }
}

function getDomain(value) {
  return new URL(normalizeUrl(value)).hostname.toLowerCase().replace(/^www\./, "");
}

function BookmarkFavicon({ id }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Globe size={18} />;
  }

  return (
    <img
      src={`/favicons/${id}.png`}
      alt=''
      className={styles.suggestionFavicon}
      loading='lazy'
      onError={() => setFailed(true)}
    />
  );
}

function validateUrl(value) {
  try {
    const normalized = normalizeUrl(value);
    const parsed = new URL(normalized);

    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

/* --------------------------------------------------
Visit Frequency Options
-------------------------------------------------- */

const VISIT_FREQUENCIES = [
  { label: "1 week", value: "1week" },
  { label: "2 weeks", value: "2weeks" },
  { label: "1 month", value: "1month" },
  { label: "2 months", value: "2months" },
  { label: "4 months", value: "4months" },
  { label: "6 months", value: "6months" },
  { label: "9 months", value: "9months" },
  { label: "12 months", value: "12months" },
];

/* --------------------------------------------------
Bookmark Form
-------------------------------------------------- */

export default function BookmarkForm({ onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState("0");
  const [visitFrequency, setVisitFrequency] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewStatus, setPreviewStatus] = useState("idle");
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");

  const requestId = useRef(0);
  const lastFetchedUrl = useRef("");

  const selectedCategory = bookmarkCategories.find((item) => item.id === categoryId);

  const subcategories = selectedCategory?.subcategories || [];

  const selectedSubcategory = subcategories.find((item) => item.id === subcategoryId);

  /* --------------------------------------------------
  Recent And Matching Bookmarks
  -------------------------------------------------- */

  const recentBookmarks = bookmarks
    .slice()
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, 5);

  const matchingBookmarks = url.trim()
    ? bookmarks
        .filter((bookmark) => {
          const searchTerm = url.trim().toLowerCase();

          return bookmark.name.toLowerCase().includes(searchTerm) || bookmark.url.toLowerCase().includes(searchTerm) || bookmark.domain.toLowerCase().includes(searchTerm);
        })
        .slice(0, 5)
    : recentBookmarks;

  /* --------------------------------------------------
  Clear Website Data
  -------------------------------------------------- */

  function clearWebsiteData() {
    requestId.current += 1;
    lastFetchedUrl.current = "";

    setUrl("");
    setName("");
    setDescription("");
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
    setError("");
  }

  /* --------------------------------------------------
  Reset Form
  -------------------------------------------------- */

  function resetForm() {
    clearWebsiteData();

    setCategoryId("");
    setSubcategoryId("");
    setTags("");
    setRating("0");
    setVisitFrequency("");
    setStep(1);
  }

  /* --------------------------------------------------
  Fetch Website Preview
  -------------------------------------------------- */

  async function fetchPreview(value) {
    const normalized = validateUrl(value);

    if (!normalized) {
      setPreview(null);
      setPreviewStatus("idle");
      setPreviewError("");
      setError("Please enter a valid website URL.");
      lastFetchedUrl.current = "";
      return false;
    }

    if (lastFetchedUrl.current === normalized && ["success", "error"].includes(previewStatus) && preview?.url === normalized) {
      return true;
    }

    const currentRequestId = ++requestId.current;

    lastFetchedUrl.current = normalized;

    setPreview(null);
    setPreviewStatus("loading");
    setPreviewError("");
    setError("");

    try {
      const response = await fetch("/api/bookmark-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalized }),
      });

      const data = await response.json();

      if (currentRequestId !== requestId.current) {
        return false;
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to retrieve website details.");
      }

      const domain = data.domain || getDomain(normalized);

      setPreview({
        ...data,
        url: normalized,
        domain,
        title: data.title || "",
        description: data.description || "",
        imageUrl: data.imageUrl || "",
        faviconUrl: data.faviconUrl || "",
        siteName: data.siteName || data.title || domain,
      });

      setName(data.title || data.siteName || domain);
      setDescription(data.description || "");
      setPreviewStatus("success");

      return true;
    } catch (fetchError) {
      if (currentRequestId !== requestId.current) {
        return false;
      }

      const domain = getDomain(normalized);

      setPreview({
        url: normalized,
        domain,
        title: "",
        description: "",
        imageUrl: "",
        faviconUrl: "",
        siteName: domain,
      });

      setName(domain);
      setDescription("");
      setPreviewStatus("error");
      setPreviewError("We couldn't retrieve the website details. You can still continue.");

      return true;
    }
  }

  /* --------------------------------------------------
  Handle URL Changes
  -------------------------------------------------- */

  function handleUrlChange(value) {
    requestId.current += 1;
    lastFetchedUrl.current = "";

    setUrl(value);
    setName("");
    setDescription("");
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
    setError("");
  }

  /* --------------------------------------------------
  Continue To Step Two
  -------------------------------------------------- */

  async function handleNext() {
    setError("");

    const normalized = validateUrl(url);

    if (!normalized) {
      setError("Please enter a valid website URL.");
      return;
    }

    if (!preview || preview.url !== normalized || !["success", "error"].includes(previewStatus)) {
      const fetched = await fetchPreview(url);

      if (!fetched) {
        return;
      }
    }

    // Do not advance if the URL changed while fetching.
    if (requestId.current !== requestId.current || validateUrl(url) !== normalized) {
      return;
    }

    setStep(2);
  }

  /* --------------------------------------------------
  Select Main Category
  -------------------------------------------------- */

  function handleCategorySelect(nextCategoryId) {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
    setError("");
  }

  /* --------------------------------------------------
  Submit Bookmark To Firestore
  -------------------------------------------------- */

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    setError("");

    const normalized = validateUrl(url);

    if (!normalized) {
      setError("Please enter a valid website URL.");
      setStep(1);
      return;
    }

    if (!preview || preview.url !== normalized) {
      setError("Please retrieve the website details first.");
      setStep(1);
      return;
    }

    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }

    if (!selectedSubcategory) {
      setError("Please select a subcategory.");
      return;
    }

    if (!visitFrequency) {
      setError("Please select a visit frequency.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError("Please sign in before adding a bookmark.");
      return;
    }

    const domain = getDomain(normalized);

    const bookmarkData = {
      name: name.trim() || preview.siteName || domain,
      url: normalized,
      domain,
      description: description.trim(),

      category: selectedCategory.name,
      categoryId: selectedCategory.id,

      subcategory: selectedSubcategory.name,
      subcategoryId: selectedSubcategory.id,

      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),

      rating: Number(rating),
      visitFrequency,

      faviconUrl: preview.faviconUrl || "",
      previewImageUrl: preview.imageUrl || "",
      originalFaviconUrl: preview.faviconUrl || "",
      originalImageUrl: preview.imageUrl || "",
      siteName: preview.siteName || domain,

      // Ownership and approval
      createdBy: user.uid,
      status: "pending",

      // Initial statistics
      visits: 0,
      addedAt: new Date().toISOString().slice(0, 10),
      lastVisitedAt: null,

      // Firestore timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    setIsSaving(true);

    try {
      await addDoc(collection(db, "bookmarks"), bookmarkData);

      // Reset only after Firestore confirms a successful write.
      resetForm();

      // Close the slide-in panel after saving.
      onCancel?.();
    } catch (saveError) {
      console.error("Unable to save bookmark:", saveError);

      if (saveError.code === "permission-denied") {
        setError("You do not have permission to save this bookmark. Check your sign-in status and Firestore rules.");
      } else {
        setError("We couldn't save your bookmark. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  /* --------------------------------------------------
  Render Form
  -------------------------------------------------- */

  return (
    <form
      className={styles.bookmarkForm}
      onSubmit={handleSubmit}
    >
      {/* Step One: URL And Preview */}

      {step === 1 && (
        <>
          <div className={styles.formField}>
            <label htmlFor='bookmark-url'>Website URL</label>

            <div className={styles.urlInputRow}>
              <div className={styles.urlInputWrapper}>
                <input
                  id='bookmark-url'
                  type='text'
                  inputMode='url'
                  className={styles.urlInput}
                  value={url}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && previewStatus !== "loading") {
                      event.preventDefault();
                      fetchPreview(url);
                    }
                  }}
                  placeholder='Paste a website URL'
                  autoComplete='url'
                  required
                />

                {url && (
                  <button
                    type='button'
                    className={styles.urlClearButton}
                    onClick={clearWebsiteData}
                    aria-label='Clear website URL'
                    title='Clear URL'
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <button
                type='button'
                className={styles.urlFetchButton}
                onClick={() => fetchPreview(url)}
                disabled={!url.trim() || previewStatus === "loading"}
                aria-label='Search website'
                title='Retrieve website details'
              >
                {previewStatus === "loading" ? <span className={styles.urlLoadingIndicator} /> : <Search size={20} />}
              </button>
            </div>
          </div>

          {/* Website Preview And Suggestions */}

          <div className={styles.previewArea}>
            {preview ? (
              <section
                className={styles.linkPreview}
                aria-label='Website link preview'
              >
                {preview.imageUrl && (
                  <div className={styles.previewImageFrame}>
                    <img
                      src={preview.imageUrl}
                      alt=''
                      className={styles.previewImage}
                      loading='lazy'
                      referrerPolicy='no-referrer'
                      onError={(event) => {
                        event.currentTarget.closest(`.${styles.previewImageFrame}`)?.classList.add(styles.previewImageFailed);
                      }}
                    />
                  </div>
                )}

                <div className={styles.previewBody}>
                  <div className={styles.previewDomain}>
                    <span>{preview.domain}</span>
                  </div>

                  <h3 className={styles.previewTitle}>
                    {preview.faviconUrl && (
                      <img
                        src={preview.faviconUrl}
                        alt=''
                        className={styles.previewFavicon}
                        loading='lazy'
                        referrerPolicy='no-referrer'
                      />
                    )}
                    <span>{name || preview.siteName || preview.domain}</span>
                  </h3>

                  {(description || preview.description) && <p className={styles.previewDescription}>{description || preview.description}</p>}

                  <p className={styles.previewUrl}>{preview.url}</p>
                </div>
              </section>
            ) : (
              <section
                className={styles.bookmarkSuggestions}
                aria-label={url.trim() ? "Matching bookmarks" : "Recently added bookmarks"}
              >
                <p className={styles.suggestionsHeading}>{url.trim() ? "Matching bookmarks" : "Recently added"}</p>

                {matchingBookmarks.length > 0 ? (
                  <div className={styles.suggestionsList}>
                    {matchingBookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        type='button'
                        className={styles.suggestionItem}
                        onClick={() => {
                          handleUrlChange(bookmark.url);
                          fetchPreview(bookmark.url);
                        }}
                      >
                        <span className={styles.suggestionIcon}>
                          <img
                            src={`/favicons/${bookmark.id}.png`}
                            alt=''
                            className={styles.suggestionIcon}
                            loading='lazy'
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        </span>

                        <span className={styles.suggestionDetails}>
                          <span className={styles.suggestionName}>{bookmark.name}</span>

                          <span className={styles.suggestionUrl}>{bookmark.url}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.suggestionsEmpty}>New Link to Hyper</p>
                )}
              </section>
            )}

            {previewStatus === "loading" && (
              <p
                className={styles.previewStatus}
                role='status'
              >
                Retrieving website details…
              </p>
            )}

            {previewError && (
              <p
                className={styles.formHint}
                role='status'
              >
                {previewError}
              </p>
            )}
          </div>

          {error && (
            <p
              className={styles.formError}
              role='alert'
            >
              {error}
            </p>
          )}

          {/* Rating */}

          <div className={styles.formField}>
            <span className={styles.ratingLabel}>Rating</span>

            <StarRating
              name='bookmark-rating'
              ratings={["Good", "Great", "Excellent", "Awesome", "Fantastic"]}
              value={Number(rating)}
              onChange={(nextRating) => setRating(String(nextRating))}
              size={32}
            />
          </div>

          {/* Visit Frequency */}

          <div className={styles.formField}>
            <span className={styles.fieldLabel}>Visit frequency *</span>

            <div className={styles.frequencyButtons}>
              {VISIT_FREQUENCIES.map((item) => {
                const selected = visitFrequency === item.value;

                return (
                  <button
                    key={item.value}
                    type='button'
                    className={`${styles.frequencyButton} ${selected ? styles.frequencyButtonActive : ""}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setVisitFrequency(item.value);
                      setError("");
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.formSubmit}
              onClick={handleNext}
              disabled={previewStatus === "loading" || !url.trim()}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}

      {/* Step Two: Website Summary And Bookmark Details */}

      {step === 2 && (
        <>
          <section
            className={styles.websiteSummary}
            aria-label='Website details'
          >
            <div className={styles.websiteSummaryHeader}>
              {preview?.faviconUrl ? (
                <img
                  src={preview.faviconUrl}
                  alt=''
                  className={styles.summaryFavicon}
                  referrerPolicy='no-referrer'
                />
              ) : (
                <span className={styles.summaryFaviconFallback}>
                  <Globe size={22} />
                </span>
              )}

              <h3 className={styles.summaryName}>{name || preview?.siteName || preview?.domain}</h3>
            </div>

            <p className={styles.summaryDescription}>{description || "No description available."}</p>

            <p className={styles.summaryUrl}>{url}</p>
          </section>

          {/* Main Categories */}

          <div className={styles.formField}>
            <span className={styles.fieldLabel}>Category *</span>

            <div className={styles.selectionButtons}>
              {bookmarkCategories
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item) => {
                  const selected = categoryId === item.id;

                  return (
                    <button
                      key={item.id}
                      type='button'
                      className={`${styles.selectionButton} ${selected ? styles.selectionButtonActive : ""}`}
                      aria-pressed={selected}
                      onClick={() => handleCategorySelect(item.id)}
                    >
                      {item.name}

                      {selected && <Check size={16} />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Subcategories */}

          {selectedCategory && (
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>Subcategory *</span>

              <div className={styles.selectionButtons}>
                {subcategories
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const selected = subcategoryId === item.id;

                    return (
                      <button
                        key={item.id}
                        type='button'
                        className={`${styles.selectionButton} ${selected ? styles.selectionButtonActive : ""}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setSubcategoryId(item.id);
                          setError("");
                        }}
                      >
                        {item.name}

                        {selected && <Check size={16} />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tags */}

          <TagInput
            value={tags}
            onChange={setTags}
            sourceTitle={preview?.title || preview?.siteName || ""}
            sourceDescription={preview?.description || ""}
            maxTags={10}
          />

          {error && (
            <p
              className={styles.formError}
              role='alert'
            >
              {error}
            </p>
          )}

          {/* Step Navigation */}

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.formCancel}
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <button
              type='submit'
              className={styles.formSubmit}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Add Bookmark"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
