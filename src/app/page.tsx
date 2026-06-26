"use client";

import { FormEvent, useMemo, useState } from "react";

const voices = [
  "Zephyr (Female)",
  "Puck (Male)",
  "Charon (Male)",
  "Kore (Female)",
  "Fenrir (Male)",
  "Leda (Female)",
  "Orus (Male)",
  "Aoede (Female)",
  "Callirrhoe (Female)",
  "Autonoe (Female)",
  "Enceladus (Male)",
  "Iapetus (Male)",
  "Umbriel (Male)",
  "Algenib (Male)",
  "Despina (Female)",
  "Erinome (Female)",
  "Laomedeia (Female)",
  "Achernar (Female)",
  "Algieba (Male)",
  "Schedar (Male)",
  "Gacrux (Female)",
  "Pulcherrima (Female)",
  "Achird (Male)",
  "Zubenelgenubi (Male)",
  "Vindemiatrix (Female)",
  "Sadachbia (Male)",
  "Sadaltager (Male)",
  "Sulafat (Female)",
  "Alnilam (Male)",
  "Rasalgethi (Male)",
] as const;

const languages = [
  "English (US)",
  "English (UK)",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese (Brazil)",
  "Japanese",
  "Korean",
  "Hindi",
] as const;

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
  logs?: string;
  urls?: {
    web?: string;
    get?: string;
  };
};

function getOutputUrl(output?: string | string[] | null) {
  if (!output) {
    return undefined;
  }

  if (Array.isArray(output)) {
    return output.find((item) => typeof item === "string" && item) as string | undefined;
  }

  return output;
}

function getStatusLabel(status?: Prediction["status"]) {
  switch (status) {
    case "starting":
      return "Waiting for prediction to start...";
    case "processing":
      return "Generating video in Replicate...";
    case "succeeded":
      return "Video generation complete.";
    case "failed":
      return "Video generation failed.";
    case "canceled":
      return "Video generation canceled.";
    default:
      return "Ready to generate your avatar video.";
  }
}

const initialForm = {
  image: "/avatar-assets/avatar.jpg",
  audio: "",
  voice_script:
    "Hi doctor, I am not feeling well today. I feel sick and I need medical help. Could you please check my condition and tell me what I should do next?",
  voice: "Zephyr (Female)",
  voice_language: "English (US)",
  voice_prompt: "Say the following with a friendly, confident tone.",
  video_prompt: "The person is talking naturally to the camera.",
  negative_prompt: "subtitles, text, watermark, blurry, low quality",
  resolution: "720p",
  seed: "",
  disable_safety_filter: false,
  disable_prompt_upsampling: false,
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [message, setMessage] = useState("");

  const outputUrl = useMemo(() => {
    const rawOutput = getOutputUrl(prediction?.output);

    if (!rawOutput) {
      return "";
    }

    return `/api/avatar/output?url=${encodeURIComponent(rawOutput)}`;
  }, [prediction?.output]);

  const statusLabel = useMemo(() => getStatusLabel(prediction?.status), [prediction?.status]);
  const isLoading = isSubmitting || isPolling;

  async function pollPrediction(id: string) {
    setIsPolling(true);

    try {
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const response = await fetch(`/api/avatar/${id}`, { cache: "no-store" });
        const data = (await response.json()) as Prediction & { message?: string };

        if (!response.ok) {
          throw new Error(data.message || "Unable to check the prediction.");
        }

        setPrediction(data);

        if (data.status === "failed" || data.status === "canceled") {
          setMessage(data.error || data.message || "The prediction did not complete successfully.");
          return;
        }

        if (data.status === "succeeded") {
          setMessage("Your video is ready. Scroll to the preview to watch it.");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 4000));
      }

      setMessage("Still processing. You can keep this page open or check the Replicate link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Polling failed.");
    } finally {
      setIsPolling(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setPrediction(null);

    try {
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as Prediction & { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Unable to start the avatar render.");
      }

      setPrediction(data);
      setMessage("Request accepted. Waiting for Replicate to process the video...");
      void pollPrediction(data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#191714]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#d8cec0] pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5d33]">
              Replicate prototype
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">
              AI Avatar Studio
            </h1>
          </div>
          <a
            className="hidden rounded-md border border-[#191714] px-4 py-2 text-sm font-semibold transition hover:bg-[#191714] hover:text-white sm:block"
            href="https://replicate.com/prunaai/p-video-avatar"
            rel="noreferrer"
            target="_blank"
          >
            Model page
          </a>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,520px)]">
          <form
            onSubmit={onSubmit}
            className="grid content-start gap-5 rounded-md border border-[#d8cec0] bg-white p-5 shadow-sm"
          >
            <div>
              <h2 className="text-xl font-semibold">Create a talking avatar</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655b51]">
                Use /avatar-assets/avatar.jpg from this project, then generate speech from the script field or provide an audio URL to drive lip sync.
              </p>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Portrait image URL</span>
              <input
                required
                type="text"
                value={form.image}
                onChange={(event) => setForm({ ...form, image: event.target.value })}
                placeholder="/avatar-assets/avatar.jpg"
                className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Resolution</span>
                <select
                  value={form.resolution}
                  onChange={(event) =>
                    setForm({ ...form, resolution: event.target.value })
                  }
                  className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
                >
                  <option>720p</option>
                  <option>1080p</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Seed</span>
                <input
                  type="number"
                  value={form.seed}
                  onChange={(event) => setForm({ ...form, seed: event.target.value })}
                  placeholder="Optional"
                  className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Audio URL</span>
              <input
                type="text"
                value={form.audio}
                onChange={(event) => setForm({ ...form, audio: event.target.value })}
                placeholder="Optional. If supplied, audio wins over script."
                className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Voice script</span>
              <textarea
                value={form.voice_script}
                onChange={(event) =>
                  setForm({ ...form, voice_script: event.target.value })
                }
                rows={5}
                className="resize-y rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Voice</span>
                <select
                  value={form.voice}
                  onChange={(event) => setForm({ ...form, voice: event.target.value })}
                  className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
                >
                  {voices.map((voice) => (
                    <option key={voice}>{voice}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Language</span>
                <select
                  value={form.voice_language}
                  onChange={(event) =>
                    setForm({ ...form, voice_language: event.target.value })
                  }
                  className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
                >
                  {languages.map((language) => (
                    <option key={language}>{language}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Voice direction</span>
              <input
                value={form.voice_prompt}
                onChange={(event) =>
                  setForm({ ...form, voice_prompt: event.target.value })
                }
                className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Video direction</span>
              <input
                value={form.video_prompt}
                onChange={(event) =>
                  setForm({ ...form, video_prompt: event.target.value })
                }
                className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Negative prompt</span>
              <input
                value={form.negative_prompt}
                onChange={(event) =>
                  setForm({ ...form, negative_prompt: event.target.value })
                }
                className="rounded-md border border-[#cabdaa] px-3 py-3 outline-none ring-[#8b5d33]/30 transition focus:ring-4"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-[#d8cec0] px-3 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.disable_safety_filter}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      disable_safety_filter: event.target.checked,
                    })
                  }
                />
                Disable safety filter
              </label>
              <label className="flex items-center gap-3 rounded-md border border-[#d8cec0] px-3 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.disable_prompt_upsampling}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      disable_prompt_upsampling: event.target.checked,
                    })
                  }
                />
                Disable prompt upsampling
              </label>
            </div>

            <button
              disabled={isSubmitting || isPolling}
              className="rounded-md bg-[#191714] px-5 py-3 font-semibold text-white transition hover:bg-[#3a3027] disabled:cursor-not-allowed disabled:bg-[#a99d8d]"
            >
              {isSubmitting || isPolling ? "Rendering..." : "Generate avatar video"}
            </button>

            <div className="mt-3 flex items-center gap-3 text-sm text-[#5c4318]">
              {(isSubmitting || isPolling) && (
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#191714]" />
              )}
              <span>{statusLabel}</span>
            </div>

            {message ? (
              <p className="mt-3 rounded-md bg-[#fff5d6] px-4 py-3 text-sm text-[#5c4318]">
                {message}
              </p>
            ) : null}
          </form>

          <aside className="grid content-start gap-5">
            <div className="rounded-md border border-[#d8cec0] bg-[#191714] p-5 text-white shadow-sm">
              <h2 className="text-xl font-semibold">Preview</h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-md bg-black relative">
                {outputUrl ? (
                  <video
                    key={outputUrl}
                    className="h-full w-full"
                    src={outputUrl}
                    controls
                    playsInline
                  />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-sm text-[#d7cfc4]">
                    Your generated MP4 will appear here after Replicate finishes.
                  </div>
                )}

                {isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                    <div className="flex flex-col items-center gap-3 text-center text-white">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30">
                        <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-white" />
                      </div>
                      <p className="max-w-xs text-sm">{statusLabel}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {prediction ? (
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#d7cfc4]">Status</dt>
                    <dd className="font-semibold">{prediction.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#d7cfc4]">Prediction ID</dt>
                    <dd className="max-w-48 truncate font-mono text-xs">{prediction.id}</dd>
                  </div>
                  {prediction.urls?.web ? (
                    <a
                      className="mt-2 rounded-md border border-white/30 px-4 py-2 text-center text-sm font-semibold transition hover:bg-white hover:text-[#191714]"
                      href={prediction.urls.web}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open in Replicate
                    </a>
                  ) : null}
                </dl>
              ) : null}
            </div>

            <div className="rounded-md border border-[#d8cec0] bg-white p-5 text-sm leading-6 text-[#655b51] shadow-sm">
              <h2 className="text-lg font-semibold text-[#191714]">Setup</h2>
              <p className="mt-2">
                Add your Replicate token to <code>.env.local</code>:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-md bg-[#f2eadf] p-3 text-xs text-[#191714]">
                REPLICATE_API_TOKEN=r8_your_token_here
              </pre>
              <p className="mt-3">
                The token is only read inside Next.js route handlers, so it is not
                exposed to the client bundle.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}



