import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../../store/authStore";
import { getLearningProfile } from "../../../../services/learningAnalyticsService";
import {
  getInitials,
  getStudentProfile,
  saveStudentProfile,
} from "../../../../services/studentProfileService";
import { TEST_STORAGE_KEYS } from "../../../../utils/constants";
import { loadFromStorage } from "../../../../utils/helpers";
import "../studentProfile.css";

const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });

const StudentProfilePage = () => {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

  const [profile, setProfile] = useState(() => getStudentProfile(user));
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState("success");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const fileInputRef = useRef(null);
  const statusTimerRef = useRef(null);

  const setFeedback = (message, tone = "success", timeout = 2400) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusTone(tone);
    setStatusMessage(message);

    if (timeout > 0) {
      statusTimerRef.current = window.setTimeout(() => {
        setStatusMessage("");
      }, timeout);
    }
  };

  useEffect(() => {
    setProfile(getStudentProfile(user));
    setAvatarLoadFailed(false);
  }, [user]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile.avatarUrl]);

  useEffect(
    () => () => {
      window.clearTimeout(statusTimerRef.current);
    },
    []
  );

  const stats = useMemo(() => {
    const history = loadFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, []);
    const normalizedHistory = Array.isArray(history) ? history : [];
    const analytics = getLearningProfile();

    return {
      totalAttempts: normalizedHistory.length,
      accuracy: Number(analytics?.totals?.averageAccuracy || 0).toFixed(2),
      estimatedRank: analytics?.rankEstimate?.estimatedRank || "-",
      streakDays: analytics?.streakDays || 0,
      xp: analytics?.xp?.totalXp || 0,
    };
  }, []);

  const isEditRequested = searchParams.get("edit") === "1";
  const displayName = profile.name?.trim() || "Student";
  const showAvatarImage = Boolean(profile.avatarUrl) && !avatarLoadFailed;

  const handleAvatarPickerOpen = () => {
    if (isAvatarUploading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setFeedback("Please select a valid image file.", "error");
      return;
    }

    if (selectedFile.size > MAX_AVATAR_SIZE_BYTES) {
      setFeedback("Image is too large. Please use an image up to 3 MB.", "error");
      return;
    }

    setIsAvatarUploading(true);
    setFeedback("Uploading profile image...", "info", 0);

    try {
      const encodedAvatar = await readFileAsDataUrl(selectedFile);
      setProfile((current) => ({
        ...current,
        avatarUrl: encodedAvatar,
      }));
      setFeedback("Image uploaded. Save profile to persist changes.", "success");
    } catch {
      setFeedback("Could not process this image. Please try another file.", "error");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isAvatarUploading) {
      setFeedback("Please wait for image upload to finish.", "info");
      return;
    }

    const currentProfile = getStudentProfile(user);

    const nextProfile = saveStudentProfile({
      user,
      updates: {
        ...profile,
        email: currentProfile.email || profile.email,
        emailLocked: true,
      },
    });

    updateUserProfile({
      name: nextProfile.name,
      email: nextProfile.email,
      avatarUrl: nextProfile.avatarUrl,
    });

    setProfile(nextProfile);
    setFeedback("Profile updated successfully.", "success");
  };

  return (
    <section className="student-profile-page">
      <div className="student-profile-page__layout">
        <article className="student-profile-card student-profile-card--identity">
          <header className="student-profile-page__hero">
            <div>
              <p className="student-profile-page__kicker">Student Identity</p>
              <h1 title={displayName}>{displayName}</h1>
              <p>Manage profile details and track your current learning momentum.</p>
            </div>
          </header>

          <div className="student-profile-page__avatar-panel">
            <div
              className={`student-profile-page__avatar-wrap ${
                isAvatarUploading ? "is-uploading" : ""
              }`}
            >
              {showAvatarImage ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${displayName} avatar`}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
              <button
                type="button"
                className="student-profile-page__avatar-edit"
                onClick={handleAvatarPickerOpen}
                disabled={isAvatarUploading}
                aria-label="Upload profile image"
                title="Upload profile image"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M15.232 5.232a2.5 2.5 0 1 1 3.536 3.536l-8.41 8.41-3.676.14.14-3.676 8.41-8.41Zm1.06 1.06-8.025 8.024-.055 1.44 1.44-.055 8.024-8.025a1 1 0 1 0-1.414-1.414ZM4 19.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 0-1.5 0v4.5h-13V6.5H10a.75.75 0 0 0 0-1.5H5.5A1.5 1.5 0 0 0 4 6.5v13Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              {isAvatarUploading ? <span className="student-profile-page__avatar-loader" /> : null}
            </div>

            <div className="student-profile-page__avatar-help">
              <strong>Profile Photo</strong>
              <p>Click the edit icon to upload JPG, PNG, GIF, or WEBP image (max 3 MB).</p>
            </div>

            <input
              ref={fileInputRef}
              className="student-profile-page__file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleAvatarFileChange}
            />
          </div>

          <section className="student-profile-page__stats">
            <article>
              <span>Total Tests Attempted</span>
              <strong>{stats.totalAttempts}</strong>
            </article>
            <article>
              <span>Average Accuracy</span>
              <strong>{stats.accuracy}%</strong>
            </article>
            <article>
              <span>Estimated Rank</span>
              <strong>{stats.estimatedRank}</strong>
            </article>
            <article>
              <span>Current Streak</span>
              <strong>{stats.streakDays} days</strong>
            </article>
            <article>
              <span>XP Earned</span>
              <strong>{stats.xp}</strong>
            </article>
          </section>
        </article>

        <form className="student-profile-card student-profile-form" onSubmit={handleSubmit}>
          <div className="student-profile-form__header">
            <h2>{isEditRequested ? "Edit Profile" : "Profile Details"}</h2>
            <span className="student-profile-form__mode-tag">
              {isEditRequested ? "Editing" : "Overview"}
            </span>
          </div>

          <label>
            <span>Full Name</span>
            <input
              type="text"
              value={profile.name}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              maxLength={80}
              required
            />
          </label>

          <label className="student-profile-form__locked-field">
            <span className="student-profile-form__label-row">
              <span>Email Address</span>
              <em>Non-editable</em>
            </span>
            <input type="email" value={profile.email} readOnly disabled aria-readonly="true" required />
            <small>This email is linked to your login account and cannot be changed here.</small>
          </label>

          <div className="student-profile-form__actions">
            <button type="submit" className="btn-primary" disabled={isAvatarUploading}>
              {isAvatarUploading ? "Uploading..." : "Save Profile"}
            </button>
            {statusMessage ? (
              <p className={`student-profile-form__status is-${statusTone}`} role="status" aria-live="polite">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
};

export default StudentProfilePage;
