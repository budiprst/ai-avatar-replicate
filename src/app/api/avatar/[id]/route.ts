import { NextResponse } from "next/server";

export async function GET(_request: Request, context: RouteContext<"/api/avatar/[id]">) {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { message: "Missing REPLICATE_API_TOKEN in .env.local." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { message: data.detail || data.title || "Unable to fetch prediction.", data },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
