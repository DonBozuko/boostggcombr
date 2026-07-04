import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  username: z
    .string()
    .min(1)
    .max(30)
    .transform((s) => s.trim().replace(/^@/, "").toLowerCase())
    .refine((s) => /^[a-z0-9._]+$/.test(s), "Handle inválido"),
});

export const contarSeguidores = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(
        `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(data.username)}`,
        {
          headers: {
            "x-ig-app-id": "936619743392459",
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            Accept: "*/*",
          },
        },
      );
      if (!res.ok) return { ok: false as const, error: "NOT_FOUND" as const };
      const json = (await res.json()) as {
        data?: {
          user?: {
            username?: string;
            full_name?: string;
            biography?: string;
            profile_pic_url?: string;
            is_verified?: boolean;
            is_private?: boolean;
            edge_followed_by?: { count?: number };
            edge_follow?: { count?: number };
            edge_owner_to_timeline_media?: { count?: number };
          };
        };
      };
      const u = json?.data?.user;
      if (!u) return { ok: false as const, error: "NOT_FOUND" as const };
      return {
        ok: true as const,
        username: u.username ?? data.username,
        fullName: u.full_name ?? "",
        bio: u.biography ?? "",
        avatar: u.profile_pic_url ?? "",
        verified: !!u.is_verified,
        privado: !!u.is_private,
        seguidores: u.edge_followed_by?.count ?? 0,
        seguindo: u.edge_follow?.count ?? 0,
        posts: u.edge_owner_to_timeline_media?.count ?? 0,
      };
    } catch (err) {
      console.error("[contarSeguidores] erro:", err);
      return { ok: false as const, error: "FETCH_FAILED" as const };
    }
  });
