import bcrypt from "bcryptjs";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*";
const ALL_PASSWORD_CHARS = `${LOWERCASE}${UPPERCASE}${DIGITS}${SYMBOLS}`;

const pickRandom = (source) => source[Math.floor(Math.random() * source.length)];

export const PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  maxLength: 64,
  requiresLowercase: true,
  requiresUppercase: true,
  requiresDigit: true,
  requiresSymbol: true,
});

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const validatePasswordStrength = (value) => {
  const password = String(value || "");
  const errors = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long.`);
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must be at most ${PASSWORD_POLICY.maxLength} characters long.`);
  }

  if (PASSWORD_POLICY.requiresLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  if (PASSWORD_POLICY.requiresUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (PASSWORD_POLICY.requiresDigit && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }

  if (PASSWORD_POLICY.requiresSymbol && !/[!@#$%^&*]/.test(password)) {
    errors.push("Password must contain at least one symbol: ! @ # $ % ^ & *");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const hashPassword = (plainPassword) => bcrypt.hashSync(plainPassword, 10);

export const verifyPassword = (plainPassword, passwordHash) => {
  if (!passwordHash) return false;
  return bcrypt.compareSync(plainPassword, passwordHash);
};

export const generateTemporaryPassword = (length = 12) => {
  const normalizedLength = Math.max(length, PASSWORD_POLICY.minLength);
  const required = [
    pickRandom(LOWERCASE),
    pickRandom(UPPERCASE),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];

  while (required.length < normalizedLength) {
    required.push(pickRandom(ALL_PASSWORD_CHARS));
  }

  for (let index = required.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [required[index], required[swapIndex]] = [required[swapIndex], required[index]];
  }

  return required.join("");
};
