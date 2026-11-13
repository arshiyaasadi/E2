import { z } from "zod";
import { normalizeIranMobile, toLatinDigits } from "@/lib/auth/mobile";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "usernameRequired"),
  password: z.string().min(1, "passwordRequired"),
  rememberMe: z.boolean(),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "firstNameInvalid"),
  lastName: z.string().trim().min(2, "lastNameInvalid"),
  mobile: z
    .string()
    .trim()
    .min(10, "mobileInvalid")
    .refine((value) => Boolean(normalizeIranMobile(toLatinDigits(value))), {
      message: "mobileInvalid",
    }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
