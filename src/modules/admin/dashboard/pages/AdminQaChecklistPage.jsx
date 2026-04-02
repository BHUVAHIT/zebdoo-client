import { useMemo, useState } from "react";
import { chapterService } from "../../../shared/services/chapter.service";
import { subjectService } from "../../../shared/services/subject.service";
import { testService } from "../../../shared/services/test.service";
import { useAppToast } from "../../../../components/notifications/useAppToast";
import { readCatalogDb, catalogStore } from "../../../../store/catalogStore";
import { getChaptersBySubject, getMcqQuestions, getSubjects } from "../../../../test/services/testService";

const DB_STORAGE_KEY = "super-admin:db:v1";

const CASES = [
  {
    id: "subjectSync",
    title: "Super Admin adds Subject -> instantly visible in Student",
  },
  {
    id: "chapterSync",
    title: "Super Admin adds Chapter -> Student sees it immediately",
  },
  {
    id: "testAttempt",
    title: "Super Admin creates Test -> Student can attempt it",
  },
  {
    id: "refreshPersistence",
    title: "Page refresh simulation -> Data persists in storage",
  },
];

const STATUS = {
  idle: "IDLE",
  running: "RUNNING",
  passed: "PASSED",
  failed: "FAILED",
};

const createInitialCaseState = () =>
  CASES.reduce((acc, item) => {
    acc[item.id] = {
      status: STATUS.idle,
      message: "Not executed yet.",
    };
    return acc;
  }, {});

const AdminQaChecklistPage = () => {
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState(() => createInitialCaseState());
  const [logs, setLogs] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const { pushToast } = useAppToast();

  const summary = useMemo(() => {
    const values = Object.values(cases);

    return {
      passed: values.filter((item) => item.status === STATUS.passed).length,
      failed: values.filter((item) => item.status === STATUS.failed).length,
      running: values.some((item) => item.status === STATUS.running),
      total: CASES.length,
    };
  }, [cases]);

  const appendLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((current) => [`${timestamp} - ${message}`, ...current].slice(0, 14));
  };

  const setCaseState = (id, patch) => {
    setCases((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  };

  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const findCreatedItem = (items, matcher) =>
    (Array.isArray(items) ? items : []).find((item) => matcher(item)) || null;

  const runSmokeChecks = async () => {
    if (busy) return;

    setBusy(true);
    setCases(createInitialCaseState());
    setLogs([]);

    const stamp = Date.now();
    const subjectCode = `QASM-${String(stamp).slice(-6)}`;
    const subjectName = `QA Smoke Subject ${stamp}`;
    const chapterTitle = `QA Smoke Chapter ${stamp}`;
    const testTitle = `QA Smoke Test ${stamp}`;

    const context = {
      subject: null,
      chapter: null,
      test: null,
      subjectCode,
      subjectName,
      chapterTitle,
      testTitle,
      stamp,
    };

    let activeCaseId = "";

    try {
      activeCaseId = "subjectSync";
      setCaseState("subjectSync", {
        status: STATUS.running,
        message: "Creating subject from admin service...",
      });
      appendLog("Creating QA subject.");

      await subjectService.create({
        code: subjectCode,
        name: subjectName,
        description: "Smoke-test generated subject for QA checklist.",
        status: "ACTIVE",
      });

      const subjectsResult = await subjectService.list({
        page: 1,
        pageSize: 25,
        search: subjectCode,
        sortBy: "createdAt",
        sortDir: "desc",
      });

      context.subject = findCreatedItem(subjectsResult.items, (item) => item.code === subjectCode);
      assert(context.subject, "Created subject could not be resolved in admin listing.");

      const studentSubjects = await getSubjects();
      assert(
        studentSubjects.some((item) => String(item.id) === String(context.subject.id)),
        "Created subject is not visible on student-side subject catalog."
      );

      setCaseState("subjectSync", {
        status: STATUS.passed,
        message: `Subject created and visible to student (${context.subject.name}).`,
      });
      appendLog("Subject sync check passed.");

      activeCaseId = "chapterSync";
      setCaseState("chapterSync", {
        status: STATUS.running,
        message: "Creating chapter under smoke-test subject...",
      });
      appendLog("Creating QA chapter.");

      await chapterService.create({
        subjectId: context.subject.id,
        title: chapterTitle,
        orderNo: 1,
        status: "ACTIVE",
      });

      const chaptersResult = await chapterService.list({
        page: 1,
        pageSize: 25,
        search: chapterTitle,
        sortBy: "createdAt",
        sortDir: "desc",
        subjectId: context.subject.id,
      });

      context.chapter = findCreatedItem(
        chaptersResult.items,
        (item) => String(item.subjectId) === String(context.subject.id) && item.title === chapterTitle
      );
      assert(context.chapter, "Created chapter could not be resolved in admin listing.");

      const studentChapters = await getChaptersBySubject(context.subject.id);
      assert(
        studentChapters.some((item) => String(item.id) === String(context.chapter.id)),
        "Created chapter is not visible on student-side chapter listing."
      );

      setCaseState("chapterSync", {
        status: STATUS.passed,
        message: `Chapter created and visible to student (${context.chapter.title}).`,
      });
      appendLog("Chapter sync check passed.");

      activeCaseId = "testAttempt";
      setCaseState("testAttempt", {
        status: STATUS.running,
        message: "Creating published test and validating attempt readiness...",
      });
      appendLog("Creating QA test.");

      await testService.create({
        subjectId: context.subject.id,
        chapterId: context.chapter.id,
        title: testTitle,
        difficulty: "MEDIUM",
        durationMinutes: 45,
        workflowStatus: "PUBLISHED",
        mixStrategy: "MANUAL",
        status: "ACTIVE",
      });

      const testsResult = await testService.list({
        page: 1,
        pageSize: 25,
        search: testTitle,
        sortBy: "createdAt",
        sortDir: "desc",
        subjectId: context.subject.id,
        chapterId: context.chapter.id,
      });

      context.test = findCreatedItem(
        testsResult.items,
        (item) => String(item.chapterId) === String(context.chapter.id) && item.title === testTitle
      );
      assert(context.test, "Created test could not be resolved in admin listing.");

      const attemptPayload = await getMcqQuestions({
        subjectId: context.subject.id,
        chapterId: context.chapter.id,
        difficultyLevel: "medium",
      });

      assert(
        Array.isArray(attemptPayload.questions) && attemptPayload.questions.length > 0,
        "Student attempt payload returned no questions for created test context."
      );

      setCaseState("testAttempt", {
        status: STATUS.passed,
        message: `Test is attemptable with ${attemptPayload.questions.length} questions.`,
      });
      appendLog("Test attemptability check passed.");

      activeCaseId = "refreshPersistence";
      setCaseState("refreshPersistence", {
        status: STATUS.running,
        message: "Simulating refresh by reloading from localStorage snapshot...",
      });
      appendLog("Running persistence check.");

      const storedRaw = window.localStorage.getItem(DB_STORAGE_KEY);
      assert(Boolean(storedRaw), "Catalog database key is missing from localStorage.");

      const storedDb = JSON.parse(storedRaw || "{}");
      assert(
        (storedDb.subjects || []).some((item) => String(item.id) === String(context.subject.id)),
        "Persisted storage does not contain created subject."
      );
      assert(
        (storedDb.chapters || []).some((item) => String(item.id) === String(context.chapter.id)),
        "Persisted storage does not contain created chapter."
      );
      assert(
        (storedDb.tests || []).some((item) => String(item.id) === String(context.test.id)),
        "Persisted storage does not contain created test."
      );

      catalogStore.getState().syncFromStorage();
      const syncedDb = readCatalogDb();

      assert(
        syncedDb.subjects.some((item) => String(item.id) === String(context.subject.id)),
        "After refresh sync, subject is missing from catalog store."
      );
      assert(
        syncedDb.chapters.some((item) => String(item.id) === String(context.chapter.id)),
        "After refresh sync, chapter is missing from catalog store."
      );
      assert(
        syncedDb.tests.some((item) => String(item.id) === String(context.test.id)),
        "After refresh sync, test is missing from catalog store."
      );

      setCaseState("refreshPersistence", {
        status: STATUS.passed,
        message: "Data persists in storage and survives refresh synchronization.",
      });
      appendLog("Persistence check passed.");

      setLastRun({
        subjectId: context.subject.id,
        chapterId: context.chapter.id,
        testId: context.test.id,
        subjectCode,
        stamp,
      });

      pushToast({
        title: "QA smoke run passed",
        message: "All four acceptance checks passed successfully.",
        tone: "success",
      });
    } catch (error) {
      const message = error?.message || "Smoke check failed unexpectedly.";
      appendLog(`Failure: ${message}`);

      if (activeCaseId) {
        setCaseState(activeCaseId, {
          status: STATUS.failed,
          message,
        });
      }

      pushToast({
        title: "QA smoke run failed",
        message,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const cleanupLastRun = async () => {
    if (busy || !lastRun?.subjectId) return;

    setBusy(true);
    appendLog("Cleaning up smoke-test entities from last run.");

    try {
      await subjectService.remove(lastRun.subjectId);
      catalogStore.getState().syncFromStorage();
      setLastRun(null);
      appendLog("Cleanup completed successfully.");
      pushToast({
        title: "Cleanup complete",
        message: "Smoke-test entities were removed.",
        tone: "info",
      });
    } catch (error) {
      const message = error?.message || "Failed to clean up smoke-test entities.";
      appendLog(`Cleanup failed: ${message}`);
      pushToast({
        title: "Cleanup failed",
        message,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const badgeClassName = (status) => {
    if (status === STATUS.passed) return "sa-badge is-active";
    if (status === STATUS.failed) return "sa-badge is-inactive";
    if (status === STATUS.running) return "sa-badge sa-qa-status--running";
    return "sa-badge sa-qa-status--idle";
  };

  return (
    <section className="sa-data-card">
      <header className="sa-data-card__head">
        <div>
          <h2>QA Checklist</h2>
          <p>
            One-click smoke checks for admin-to-student sync, attempt readiness, and persistence.
          </p>
        </div>

        <div className="sa-data-card__actions">
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            disabled={busy}
            onClick={runSmokeChecks}
          >
            {busy ? "Running checks..." : "Run Acceptance Smoke"}
          </button>
          <button
            type="button"
            className="sa-btn"
            disabled={busy || !lastRun?.subjectId}
            onClick={cleanupLastRun}
          >
            Cleanup Last Run
          </button>
        </div>
      </header>

      <div className="sa-qa-grid">
        <article className="sa-qa-card">
          <h3>Acceptance Scenarios</h3>
          <ul className="sa-qa-list">
            {CASES.map((item) => (
              <li key={item.id}>
                <div className="sa-qa-list__row">
                  <span>{item.title}</span>
                  <span className={badgeClassName(cases[item.id].status)}>{cases[item.id].status}</span>
                </div>
                <p>{cases[item.id].message}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="sa-qa-card">
          <h3>Run Summary</h3>
          <div className="sa-qa-summary">
            <p>
              Passed: <strong>{summary.passed}</strong> / {summary.total}
            </p>
            <p>
              Failed: <strong>{summary.failed}</strong>
            </p>
            <p>
              State: <strong>{busy ? "Running" : "Idle"}</strong>
            </p>
            <p>
              Last run stamp: <strong>{lastRun?.stamp || "-"}</strong>
            </p>
          </div>

          <h4>Event Log</h4>
          <ul className="sa-qa-log">
            {logs.length === 0 ? <li>No execution logs yet.</li> : null}
            {logs.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
};

export default AdminQaChecklistPage;
