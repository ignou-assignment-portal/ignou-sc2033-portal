/**
 * Vercel Serverless Function Proxy for Google Apps Script Web App
 * Avoids CORS limitations and smoothly follows 302 redirects from script.google.com
 */

const DEFAULT_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwb-LmuQ2TiUQEGmdWKZAKd9jB9hxeIESL4i-F0h-NwSba8BEbdTaqhato_9aWeXlxy/exec";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const customUrl = req.query.scriptUrl ? String(req.query.scriptUrl) : null;
    const targetScriptUrl = customUrl || DEFAULT_SCRIPT_URL;

    if (req.method === "GET") {
      // Forward all search query parameters
      const urlObj = new URL(targetScriptUrl);
      Object.keys(req.query).forEach((key) => {
        if (key !== "scriptUrl") {
          urlObj.searchParams.set(key, String(req.query[key]));
        }
      });

      const response = await fetch(urlObj.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        redirect: "follow",
      });

      const responseText = await response.text();
      try {
        const json = JSON.parse(responseText);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(json);
      } catch (parseErr) {
        // Return raw text if not JSON
        return res.status(response.status).send(responseText);
      }
    }

    if (req.method === "POST") {
      const actionParam = req.query.action ? `?action=${encodeURIComponent(String(req.query.action))}` : "";
      const targetUrl = `${targetScriptUrl}${actionParam}`;

      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: payload,
        redirect: "follow",
      });

      const responseText = await response.text();
      try {
        const json = JSON.parse(responseText);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(json);
      } catch (parseErr) {
        return res.status(response.status).send(responseText);
      }
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error("Vercel Serverless Sheets Proxy Error:", error);
    return res.status(500).json({
      error: "Failed to communicate with Google Apps Script backend",
      details: error.message || String(error),
    });
  }
}
