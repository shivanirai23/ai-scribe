import { confirmResetPassword } from "aws-amplify/auth";
import { formatAuthError } from "@/lib/auth/errors";

export const PASSWORD_REQUIREMENTS_MSG =
  "Password must be 8+ chars with lowercase, uppercase, number, and special character.";

/**
 * Probe password — never stored; used only to validate a reset code with Cognito.
 * Must be at least 2 non-whitespace characters to satisfy Cognito's
 * `^[\S]+.*[\S]+$` constraint, but still fail the real password policy.
 */
const RESET_CODE_PROBE_PASSWORD = "!!";

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

function getAuthErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

function getAuthErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

export function isInvalidResetCodeError(error: unknown): boolean {
  const name = getAuthErrorName(error);
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    name === "CodeMismatchException" ||
    name === "ExpiredCodeException" ||
    message.includes("invalid code") ||
    message.includes("expired code") ||
    message.includes("confirmation code")
  );
}

/**
 * Cognito confirms code and password together. A deliberately invalid password
 * lets us verify the code: InvalidPasswordException means the code was accepted.
 */
export async function verifyResetCode(
  username: string,
  confirmationCode: string
): Promise<{ valid: true } | { valid: false; error: string }> {
  try {
    await confirmResetPassword({
      username,
      confirmationCode,
      newPassword: RESET_CODE_PROBE_PASSWORD,
    });
    return { valid: true };
  } catch (error) {
    const name = getAuthErrorName(error);
    const message = getAuthErrorMessage(error);

    if (
      name === "InvalidPasswordException" ||
      message.includes("Password did not conform") ||
      message.includes("Invalid password") ||
      (name === "InvalidParameterException" &&
        message.toLowerCase().includes("password") &&
        message.toLowerCase().includes("regular expression pattern"))
    ) {
      return { valid: true };
    }

    if (isInvalidResetCodeError(error)) {
      return { valid: false, error: "Invalid or expired reset code. Please try again." };
    }

    return {
      valid: false,
      error: formatAuthError(error, "Could not verify reset code. Please try again."),
    };
  }
}
