export const FATHER_EMAIL = "mak.azeemi@gmail.com";

export function isFatherEmail(
  email?: string | null
): boolean {
  if (!email || !FATHER_EMAIL) {
    return false;
  }

  return (
    email.trim().toLowerCase() ===
    FATHER_EMAIL.trim().toLowerCase()
  );
}