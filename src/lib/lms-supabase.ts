export type Course = {
  id: string;
  slug: string;
  title: string;
  teacher_id: string | null;
  price_inr: number;
  preview_minutes: number;
  video_url: string;
  updated_at: string;
  status?: "published" | "draft" | "review";
};

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  lesson_order: number;
  required: boolean;
  created_at: string;
  updated_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completion_percentage: number;
  status: "in_progress" | "completed";
  completed_at: string | null;
};

export type LessonProgress = {
  id: string;
  student_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

const COURSES_KEY = "skillbridge_local_courses";
const LESSONS_KEY = "skillbridge_local_course_lessons";
const ENROLLMENTS_KEY = "skillbridge_local_enrollments";
const PROGRESS_KEY = "skillbridge_local_lesson_progress";
const CERTIFICATES_KEY = "skillbridge_local_certificates";

const VIDEO_TS =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const VIDEO_REACT =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
const VIDEO_SYS =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const VIDEO_DSA =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

const DEFAULT_COURSES: Course[] = [
  {
    id: "c-ts",
    slug: "advanced-typescript",
    title: "Advanced TypeScript & Design Patterns",
    teacher_id: null,
    price_inr: 1299,
    preview_minutes: 5,
    video_url: VIDEO_TS,
    updated_at: new Date().toISOString(),
    status: "published",
  },
  {
    id: "c-react",
    slug: "react-performance",
    title: "React Performance & Architecture",
    teacher_id: null,
    price_inr: 1499,
    preview_minutes: 5,
    video_url: VIDEO_REACT,
    updated_at: new Date().toISOString(),
    status: "published",
  },
  {
    id: "c-sys",
    slug: "system-design",
    title: "System Design Fundamentals",
    teacher_id: null,
    price_inr: 999,
    preview_minutes: 5,
    video_url: VIDEO_SYS,
    updated_at: new Date().toISOString(),
    status: "published",
  },
  {
    id: "c-dsa",
    slug: "dsa",
    title: "Data Structures & Algorithms",
    teacher_id: null,
    price_inr: 799,
    preview_minutes: 5,
    video_url: VIDEO_DSA,
    updated_at: new Date().toISOString(),
    status: "draft",
  },
];

const DEFAULT_LESSONS: Lesson[] = [
  ["c-ts", "Course Overview & Project Setup", "12m", VIDEO_TS, true],
  ["c-ts", "Advanced Generic Constraints & Type Mappings", "28m", VIDEO_TS, false],
  ["c-ts", "Distributive Conditional Types & Infer", "34m", VIDEO_TS, false],
  ["c-react", "React Profiler & Flamegraphs Deep Dive", "30m", VIDEO_REACT, true],
  ["c-react", "Memoization and Rendering Optimization", "24m", VIDEO_REACT, false],
  ["c-react", "Virtualization and Performance Architecture", "36m", VIDEO_REACT, false],
  ["c-sys", "Scale from Zero to 10M Users", "25m", VIDEO_SYS, true],
  ["c-sys", "Database Sharding & Consistent Hashing", "42m", VIDEO_SYS, false],
  ["c-sys", "Caching, Queues and Reliability", "38m", VIDEO_SYS, false],
  ["c-dsa", "Arrays, Strings and Complexity", "25m", VIDEO_DSA, true],
  ["c-dsa", "Trees, Graphs and Traversals", "35m", VIDEO_DSA, false],
  ["c-dsa", "Dynamic Programming Fundamentals", "40m", VIDEO_DSA, false],
].map(([course_id, title, duration, video_url, preview], index) => ({
  id: `lesson-${course_id}-${index + 1}`,
  course_id: course_id as string,
  title: title as string,
  description: `${duration} lesson for this course.`,
  video_url: video_url as string,
  lesson_order: index + 1,
  required: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    return fallback;
  }
  return fallback;
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listPublishedCourses() {
  return read<Course[]>(COURSES_KEY, DEFAULT_COURSES).filter(
    (course) => course.status === "published",
  );
}

export async function listLocalCourses() {
  return read<Course[]>(COURSES_KEY, DEFAULT_COURSES);
}

export async function saveLocalCourse(course: Course) {
  const courses = read<Course[]>(COURSES_KEY, DEFAULT_COURSES);
  const updated = { ...course, updated_at: new Date().toISOString() };
  const index = courses.findIndex((item) => item.id === course.id);
  if (index >= 0) courses[index] = updated;
  else courses.unshift(updated);
  write(COURSES_KEY, courses);
  window.dispatchEvent(new CustomEvent("lms_courses_updated"));
  return updated;
}

export async function getCourseById(courseId: string) {
  return (
    read<Course[]>(COURSES_KEY, DEFAULT_COURSES).find((course) => course.id === courseId) ?? null
  );
}

export async function getCourseLessons(courseId: string) {
  return read<Lesson[]>(LESSONS_KEY, DEFAULT_LESSONS)
    .filter((lesson) => lesson.course_id === courseId)
    .sort((a, b) => a.lesson_order - b.lesson_order);
}

export async function getMyEnrollments(studentId: string) {
  return read<Enrollment[]>(ENROLLMENTS_KEY, []).filter(
    (enrollment) => enrollment.student_id === studentId,
  );
}

export async function getMyLessonProgress(studentId: string, courseId?: string) {
  return read<LessonProgress[]>(PROGRESS_KEY, []).filter(
    (item) => item.student_id === studentId && (!courseId || item.course_id === courseId),
  );
}

export async function enrollInCourse(studentId: string, courseId: string) {
  const courses = read<Course[]>(COURSES_KEY, DEFAULT_COURSES);
  const course = courses.find((item) => item.id === courseId);
  if (!course || course.status !== "published")
    throw new Error("This course is not available for enrollment.");

  const enrollments = read<Enrollment[]>(ENROLLMENTS_KEY, []);
  const existing = enrollments.find(
    (item) => item.student_id === studentId && item.course_id === courseId,
  );
  if (existing) return existing;

  const enrollment: Enrollment = {
    id: id("enr"),
    student_id: studentId,
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
    completion_percentage: 0,
    status: "in_progress",
    completed_at: null,
  };
  write(ENROLLMENTS_KEY, [enrollment, ...enrollments]);
  window.dispatchEvent(new CustomEvent("lms_students_updated"));
  return enrollment;
}

export async function completeLesson(lessonId: string) {
  const sessionRaw =
    typeof window !== "undefined" ? localStorage.getItem("skillbridge_local_session") : null;
  if (!sessionRaw) throw new Error("Please sign in before completing a lesson.");
  const student = JSON.parse(sessionRaw) as { id: string };
  const lessons = read<Lesson[]>(LESSONS_KEY, DEFAULT_LESSONS);
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error("Lesson not found.");

  const progress = read<LessonProgress[]>(PROGRESS_KEY, []);
  const now = new Date().toISOString();
  const existing = progress.find(
    (item) => item.student_id === student.id && item.lesson_id === lessonId,
  );
  if (existing) {
    existing.completed = true;
    existing.completed_at = existing.completed_at ?? now;
    existing.updated_at = now;
  } else {
    progress.push({
      id: id("progress"),
      student_id: student.id,
      course_id: lesson.course_id,
      lesson_id: lesson.id,
      completed: true,
      completed_at: now,
      updated_at: now,
    });
  }
  write(PROGRESS_KEY, progress);

  const courseLessons = lessons.filter(
    (item) => item.course_id === lesson.course_id && item.required,
  );
  const completedCount = progress.filter(
    (item) =>
      item.student_id === student.id &&
      item.course_id === lesson.course_id &&
      item.completed &&
      courseLessons.some((l) => l.id === item.lesson_id),
  ).length;
  const percentage = Math.round((completedCount / Math.max(1, courseLessons.length)) * 100);
  const enrollments = read<Enrollment[]>(ENROLLMENTS_KEY, []);
  const enrollment = enrollments.find(
    (item) => item.student_id === student.id && item.course_id === lesson.course_id,
  );
  if (enrollment) {
    enrollment.completion_percentage = percentage;
    enrollment.status = percentage >= 100 ? "completed" : "in_progress";
    enrollment.completed_at = percentage >= 100 ? (enrollment.completed_at ?? now) : null;
    write(ENROLLMENTS_KEY, enrollments);
  }

  if (percentage >= 100) {
    const certificates = read<
      Array<{
        id: string;
        student_id: string;
        course_id: string;
        certificate_number: string;
        issued_at: string;
      }>
    >(CERTIFICATES_KEY, []);
    if (
      !certificates.some(
        (certificate) =>
          certificate.student_id === student.id && certificate.course_id === lesson.course_id,
      )
    ) {
      certificates.push({
        id: id("cert"),
        student_id: student.id,
        course_id: lesson.course_id,
        certificate_number: `SKILL-${lesson.course_id.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        issued_at: now,
      });
      write(CERTIFICATES_KEY, certificates);
    }
  }

  window.dispatchEvent(new CustomEvent("lms_students_updated"));
  window.dispatchEvent(new CustomEvent("lms_progress_updated"));
  return enrollment ?? null;
}

export async function getInstructorEnrollments(courseIds: string[]) {
  const allowed = new Set(courseIds);
  return read<Enrollment[]>(ENROLLMENTS_KEY, []).filter((item) => allowed.has(item.course_id));
}

export async function getCertificates(studentId: string) {
  return read<
    Array<{
      id: string;
      student_id: string;
      course_id: string;
      certificate_number: string;
      issued_at: string;
    }>
  >(CERTIFICATES_KEY, []).filter((certificate) => certificate.student_id === studentId);
}
