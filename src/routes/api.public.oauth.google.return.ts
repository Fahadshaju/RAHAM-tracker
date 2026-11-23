import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/oauth/google/return")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const success = url.searchParams.get("success") === "true";
        const code = url.searchParams.get("code");
        const connectorId = url.searchParams.get("connector_id");
        const result = {
          type: success ? "appUserConnectorOAuthComplete" : "appUserConnectorOAuthFailed",
          connectorId,
          code,
        };
        const safe = JSON.stringify(result).replace(/</g, "\\u003c");
        return new Response(
          `<!doctype html><html><head><title>RAHAM · Calendar connection</title></head><body><p>${success ? "Calendar consent completed. Returning to RAHAM…" : "Calendar consent failed. Return to RAHAM and try again."}</p><script>if(window.opener && window.opener!==window){window.opener.postMessage(${safe},window.location.origin);window.close();}</script></body></html>`,
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
            },
          },
        );
      },
    },
  },
});
