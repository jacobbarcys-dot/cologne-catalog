import { ImageResponse } from "next/og";

// Home-screen icon for iPhone/iPad (they ignore SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1a17",
        }}
      >
        <div style={{ width: 30, height: 22, borderRadius: 6, background: "#d39a5c" }} />
        <div style={{ width: 16, height: 12, background: "#d39a5c" }} />
        <div
          style={{
            width: 92,
            height: 96,
            borderRadius: 22,
            background: "#d39a5c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 60, height: 34, borderRadius: 8, background: "rgba(31,26,23,0.35)" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
