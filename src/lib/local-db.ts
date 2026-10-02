export type LocalRole = "admin" | "teacher" | "student";

export interface LocalUser {
  id: string;
  email: string;
  user_metadata: {
    display_name: string;
    email: string;
    role: LocalRole;
  };
  created_at: string;
  updated_at: string;
}

interface StoredUser extends LocalUser {
  passwordHash: string;
}

const USERS_KEY = "skillbridge_local_users";
const SESSION_KEY = "skillbridge_local_session";

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createLocalUser(params: {
  email: string;
  password: string;
  name?: string;
  role?: LocalRole;
}): Promise<{ user?: LocalUser; error?: string }> {
  const email = params.email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((user) => user.email === email)) {
    return { error: "An account with this email already exists." };
  }

  const now = new Date().toISOString();
  const displayName = params.name?.trim() || email.split("@")[0] || "Learner";
  const user: LocalUser = {
    id: makeId(),
    email,
    user_metadata: {
      display_name: displayName,
      email,
      role: params.role ?? "student",
    },
    created_at: now,
    updated_at: now,
  };

  users.push({ ...user, passwordHash: await hashPassword(params.password) });
  writeUsers(users);
  setLocalSession(user);
  return { user };
}

export async function signInLocalUser(params: {
  email: string;
  password: string;
}): Promise<{ user?: LocalUser; error?: string }> {
  const email = params.email.trim().toLowerCase();
  const passwordHash = await hashPassword(params.password);
  const user = readUsers().find(
    (candidate) => candidate.email === email && candidate.passwordHash === passwordHash,
  );

  if (!user) return { error: "Invalid email or password." };

  const { passwordHash: _passwordHash, ...safeUser } = user;
  setLocalSession(safeUser);
  return { user: safeUser };
}

export function setLocalSession(user: LocalUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("local_auth_changed"));
}

export function getLocalSession(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("local_auth_changed"));
}

export function getLocalUserRole(user: LocalUser | null): LocalRole {
  return user?.user_metadata?.role ?? "student";
}
