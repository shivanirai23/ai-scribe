export const PASSWORD_REQUIREMENTS_MSG =
  "Password must be 8+ chars with lowercase, uppercase, number, and special character.";

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

export function isInvalidResetCodeError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : "";

  return (
    message.includes("invalid code") ||
    message.includes("expired code") ||
    message.includes("confirmation code") ||
    message.includes("code mismatch") ||
    message.includes("invalid verification") ||
    message.includes("verification code")
  );
}
