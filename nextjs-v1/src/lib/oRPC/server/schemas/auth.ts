import z from "zod";

export const CredentialSchema = z.object({
  email: z.email(), // TODO: Convert to email once we upgrade to zod 4
  password: z.string(),
});

export const TokenSchema = z.object({
  token: z.string(),
});
