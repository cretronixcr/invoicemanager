"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
  email?: string;
} | undefined;

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input" };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for every failure so emails can't be enumerated.
  const invalid = { error: "Invalid email or password", email };

  if (!user) return invalid;

  let passwordOk = false;
  if (isBcryptHash(user.password)) {
    passwordOk = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plain-text password (seeded before hashing): verify, then upgrade.
    passwordOk = password === user.password;
    if (passwordOk) {
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
    }
  }
  if (!passwordOk) return invalid;

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
