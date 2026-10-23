import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASKI0u0KBCPz0vg5ro0XhJlSSuWxrW8OU",
  authDomain: "versantpro-7a2af.firebaseapp.com",
  projectId: "versantpro-7a2af",
  storageBucket: "versantpro-7a2af.firebasestorage.app",
  messagingSenderId: "1032992540620",
  appId: "1:1032992540620:web:49d9ff4238223a08edff69",
  measurementId: "G-TN5TJE64YZ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const LOCAL_KEY = "versantpro_daily_activity_v1";
const SECTION_NAMES = ["reading", "repeat", "conversation", "dictation", "blanks", "passage"];

function dateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function addDays(key, amount) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    // Private browsing or disabled storage; cloud sync can still work.
  }
}

function blankSections() {
  return Object.fromEntries(SECTION_NAMES.map((name) => [name, 0]));
}

function normaliseDays(days) {
  return days
    .filter((day) => day && day.questionsSolved > 0)
    .map((day) => ({
      date: day.date,
      questionsSolved: Number(day.questionsSolved || 0),
      sections: { ...blankSections(), ...(day.sections || {}) }
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function calculateCurrentStreak(days) {
  const keys = new Set(days.map((day) => day.date));
  const today = dateKey();
  const start = keys.has(today) ? today : (keys.has(addDays(today, -1)) ? addDays(today, -1) : null);
  if (!start) return 0;

  let streak = 0;
  let cursor = start;
  while (keys.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function localDays() {
  return normaliseDays(Object.entries(readLocal()).map(([date, value]) => ({ date, ...value })));
}

function updateLocal(section) {
  const data = readLocal();
  const today = dateKey();
  const current = data[today] || { questionsSolved: 0, sections: blankSections() };
  current.questionsSolved = Number(current.questionsSolved || 0) + 1;
  current.sections = { ...blankSections(), ...(current.sections || {}) };
  current.sections[section] = Number(current.sections[section] || 0) + 1;
  data[today] = current;
  writeLocal(data);
  return current;
}

async function cloudRecord(section, score, questionId) {
  const user = auth.currentUser;
  if (!user) return false;

  const today = dateKey();
  const activityRef = doc(db(), "users", user.uid, "activity", today);
  const userRef = doc(db(), "users", user.uid);

  await runTransaction(db(), async (transaction) => {
    const [activitySnap, userSnap] = await Promise.all([
      transaction.get(activityRef),
      transaction.get(userRef)
    ]);

    const oldActivity = activitySnap.exists() ? activitySnap.data() : {};
    const sections = { ...blankSections(), ...(oldActivity.sections || {}) };
    sections[section] = Number(sections[section] || 0) + 1;

    const oldUser = userSnap.exists() ? userSnap.data() : {};
    const oldState = oldUser.state || {};
    const previousDate = oldState.lastPracticeDate;
    const currentStreak = previousDate === today
      ? Number(oldState.currentStreak || 0)
      : previousDate === addDays(today, -1)
        ? Number(oldState.currentStreak || 0) + 1
        : 1;
    const longestStreak = Math.max(Number(oldState.longestStreak || 0), currentStreak);

    transaction.set(activityRef, {
      date: today,
      questionsSolved: Number(oldActivity.questionsSolved || 0) + 1,
      sections,
      lastPracticeAt: serverTimestamp()
    }, { merge: true });

    transaction.set(userRef, {
      email: user.email,
      state: {
        ...oldState,
        currentStreak,
        longestStreak,
        lastPracticeDate: today,
        totalQuestionsSolved: Number(oldState.totalQuestionsSolved || 0) + 1,
        lastSection: section,
        lastScore: Number(score || 0),
        lastQuestionId: questionId || null
      }
    }, { merge: true });
  });

  return true;
}

function db() {
  // Lazy import avoids loading Firestore on pages that only need the local UI.
  return firestoreDb;
}

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firestoreDb = getFirestore(app);

export async function recordPractice(section, score = 0, questionId = "") {
  if (!SECTION_NAMES.includes(section)) return;
  updateLocal(section);
  try {
    await cloudRecord(section, score, questionId);
  } catch (error) {
    console.warn("Daily practice could not sync to Firebase:", error);
  }
  window.dispatchEvent(new CustomEvent("versantpro:activity", { detail: { section } }));
}

export async function loadActivity() {
  const user = auth.currentUser;
  if (!user) return localDays();

  try {
    const activityQuery = query(
      collection(db(), "users", user.uid, "activity"),
      orderBy("date", "desc"),
      limit(180)
    );
    const snapshot = await getDocs(activityQuery);
    const days = snapshot.docs.map((item) => ({ date: item.id, ...item.data() }));
    return normaliseDays(days);
  } catch (error) {
    console.warn("Activity could not be loaded from Firebase:", error);
    return localDays();
  }
}

export async function getStreakSummary() {
  const days = await loadActivity();
  const totalQuestions = days.reduce((sum, day) => sum + day.questionsSolved, 0);
  const longestStreak = (() => {
    let longest = 0;
    let run = 0;
    let previous = null;
    [...days].sort((a, b) => a.date.localeCompare(b.date)).forEach((day) => {
      if (previous && day.date === addDays(previous, 1)) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      previous = day.date;
    });
    return longest;
  })();

  return {
    days,
    currentStreak: calculateCurrentStreak(days),
    longestStreak,
    totalQuestions
  };
}

export function getAuthInstance() {
  return auth;
}

window.recordPractice = recordPractice;
window.getStreakSummary = getStreakSummary;

// Keep the top-corner streak badge fresh after a practice answer is saved.
onAuthStateChanged(auth, () => {
  window.dispatchEvent(new CustomEvent("versantpro:auth-ready"));
});
