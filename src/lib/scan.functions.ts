import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { scanWithGemini } from "./scan.server";

// ~8 MB of base64; the browser shrinks photos well below this before sending.
const MAX_IMAGE_CHARS = 8_000_000;

export const scanPanelPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        apiKey: z.string().trim().min(10).max(200),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        imageBase64: z.string().min(100).max(MAX_IMAGE_CHARS),
      })
      .parse(d),
  )
  .handler(({ data }) => scanWithGemini(data.apiKey, data.mimeType, data.imageBase64));
