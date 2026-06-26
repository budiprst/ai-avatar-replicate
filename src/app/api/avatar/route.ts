import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { NextResponse } from "next/server";

const REPLICATE_MODEL = "prunaai/p-video-avatar";
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type AvatarRequest = {
  image?: string;
  audio?: string;
  resolution?: string;
  voice?: string;
  voice_script?: string;
  voice_prompt?: string;
  voice_language?: string;
  video_prompt?: string;
  negative_prompt?: string;
  seed?: string;
  disable_safety_filter?: boolean;
  disable_prompt_upsampling?: boolean;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assertUrl(value: string, field: string) {
  try {
    const url = new URL(value);

    if (!["http:", "https:", "data:"].includes(url.protocol)) {
      return `${field} must be an HTTP, HTTPS, or data URL.`;
    }
  } catch {
    return `${field} must be a valid URL.`;
  }

  return "";
}

async function resolveImageInput(value: string) {
  if (!value.startsWith("/")) {
    return value;
  }

  const normalizedPath = normalize(value).replace(/^([/\\])+/, "");
  const publicRoot = join(process.cwd(), "public");
  const filePath = join(publicRoot, normalizedPath);

  if (!filePath.startsWith(publicRoot)) {
    throw new Error("Image path must stay inside the public folder.");
  }

  const extension = extname(filePath).toLowerCase();
  const mimeType = mimeTypes[extension];

  if (!mimeType) {
    throw new Error("Local image must be a jpg, jpeg, png, or webp file.");
  }

  const file = await readFile(filePath);
  return `data:${mimeType};base64,${file.toString("base64")}`;
}

export async function POST(request: Request) {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { message: "Missing REPLICATE_API_TOKEN in .env.local." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AvatarRequest;
  const image = cleanString(body.image);
  const audio = cleanString(body.audio);
  const voiceScript = cleanString(body.voice_script);

  if (!image) {
    return NextResponse.json({ message: "Portrait image URL is required." }, { status: 400 });
  }

  let imageInput = image;

  if (image.startsWith("/")) {
    try {
      imageInput = await resolveImageInput(image);
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unable to read local image." },
        { status: 400 },
      );
    }
  } else {
    const imageError = assertUrl(image, "Portrait image URL");

    if (imageError) {
      return NextResponse.json({ message: imageError }, { status: 400 });
    }
  }

  if (audio) {
    const audioError = assertUrl(audio, "Audio URL");

    if (audioError) {
      return NextResponse.json({ message: audioError }, { status: 400 });
    }
  }

  if (!audio && !voiceScript) {
    return NextResponse.json(
      { message: "Add a voice script or provide an audio URL." },
      { status: 400 },
    );
  }

  const seed = cleanString(body.seed);
  const input: Record<string, string | number | boolean> = {
    image: imageInput,
    resolution: body.resolution === "1080p" ? "1080p" : "720p",
    voice: cleanString(body.voice) || "Zephyr (Female)",
    voice_script: voiceScript,
    voice_prompt: cleanString(body.voice_prompt) || "Say the following.",
    voice_language: cleanString(body.voice_language) || "English (US)",
    video_prompt: cleanString(body.video_prompt) || "The person is talking.",
    negative_prompt: cleanString(body.negative_prompt),
    disable_safety_filter: Boolean(body.disable_safety_filter),
    disable_prompt_upsampling: Boolean(body.disable_prompt_upsampling),
  };

  if (audio) {
    input.audio = audio;
  }

  if (seed) {
    const parsedSeed = Number(seed);

    if (!Number.isInteger(parsedSeed)) {
      return NextResponse.json({ message: "Seed must be an integer." }, { status: 400 });
    }

    input.seed = parsedSeed;
  }

  const replicateResponse = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=3",
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL,
      input,
    }),
  });

  const data = await replicateResponse.json();

  if (!replicateResponse.ok) {
    return NextResponse.json(
      { message: data.detail || data.title || "Replicate rejected the prediction.", data },
      { status: replicateResponse.status },
    );
  }

  return NextResponse.json(data);
}
