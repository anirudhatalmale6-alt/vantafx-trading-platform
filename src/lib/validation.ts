import { z } from "zod";
import { INSTRUMENTS } from "@/lib/instruments";

const SYMBOLS = INSTRUMENTS.map((i) => i.symbol) as [string, ...string[]];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter a valid email address")
  .max(160, "Email address is too long")
  .email("Enter a valid email address");

/**
 * Password rules are enforced here and nowhere else, so the register form, the
 * change-password form and the seed script can never drift apart.
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200, "Password is too long")
  .refine((v) => /[a-z]/.test(v), "Password needs a lower-case letter")
  .refine((v) => /[A-Z]/.test(v), "Password needs an upper-case letter")
  .refine((v) => /[0-9]/.test(v), "Password needs a digit");

const nameSchema = z.string().trim().min(1, "Required").max(60);

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  country: z.string().trim().max(60).optional().or(z.literal("")),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the risk disclosure to continue" }),
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordSchema,
});

export const openTradeSchema = z.object({
  symbol: z.enum(SYMBOLS),
  side: z.enum(["BUY", "SELL"]),
  volume: z
    .number()
    .positive("Volume must be greater than zero")
    .min(0.01, "Minimum volume is 0.01 lots")
    .max(50, "Maximum volume is 50 lots"),
  stopLoss: z.number().positive().nullable().optional(),
  takeProfit: z.number().positive().nullable().optional(),
});

export const closeTradeSchema = z.object({
  tradeId: z.string().min(1),
});

export const chatMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message is too long"),
  // Admins post into a specific client's thread; clients always post into their own.
  threadId: z.string().min(1).optional(),
});

export const adminUserUpdateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  balanceAdjustment: z.number().finite().min(-1_000_000).max(1_000_000).optional(),
});
