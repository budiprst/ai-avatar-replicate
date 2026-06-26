import { NextResponse } from "next/server";

const allowedHosts = ["replicate.delivery", "replicate.com"];

function isAllowedOutputUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  );
}

export async function GET(request: Request) {
  const token = process.env.REPLICATE_API_TOKEN;
  const urlParam = new URL(request.url).searchParams.get("url");

  if (!token) {
    return NextResponse.json(
      { message: "Missing REPLICATE_API_TOKEN in .env.local." },
      { status: 500 },
    );
  }

  if (!urlParam) {
    return NextResponse.json({ message: "Output URL is required." }, { status: 400 });
  }

  let outputUrl: URL;

  try {
    outputUrl = new URL(urlParam);
  } catch {
    return NextResponse.json({ message: "Output URL is invalid." }, { status: 400 });
  }

  if (!isAllowedOutputUrl(outputUrl)) {
    return NextResponse.json({ message: "Output URL host is not allowed." }, { status: 400 });
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };
  const range = request.headers.get("range");

  if (range) {
    headers.Range = range;
  }

  const response = await fetch(outputUrl, { headers, cache: "no-store" });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { message: "Unable to fetch the generated video." },
      { status: response.status || 502 },
    );
  }

  const responseHeaders = new Headers({
    "Content-Type": response.headers.get("content-type") || "video/mp4",
    "Accept-Ranges": response.headers.get("accept-ranges") || "bytes",
    "Cache-Control": "private, no-store",
  });
  const contentLength = response.headers.get("content-length");
  const contentRange = response.headers.get("content-range");

  if (contentLength) {
    responseHeaders.set("Content-Length", contentLength);
  }

  if (contentRange) {
    responseHeaders.set("Content-Range", contentRange);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
