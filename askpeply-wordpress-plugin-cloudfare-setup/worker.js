/**
 * AskPeply Central Server - License, Anti-Abuse Free Tier & AI Gateway
 * Cloudflare Worker with D1 Database, Google Gemini Proxy & Resend.com
 *
 * All secrets are managed via Cloudflare Worker Settings > Variables and Secrets:
 * - GEMINI_API_KEY: Google Gemini API Key (starts with AIzaSy...)
 * - RESEND_API_KEY: Resend.com API Key (starts with re_...)
 * - RESEND_FROM_EMAIL: (Optional) Verified sender email (default: AskPeply <onboarding@resend.dev>)
 * - DB: Cloudflare D1 Database binding
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-License-Key, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizeDomain(url) {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase()
    .trim();
}

function generateLicenseKey(plan) {
  const prefix = plan === "pro" ? "ASK-PRO" : plan === "growth" ? "ASK-GRW" : "ASK-STR";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "", part2 = "";
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}-${part1}-${part2}`;
}

async function getGeminiCandidateModels(apiKey) {
  const fallback = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(apiKey)}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (listRes.ok) {
      const data = await listRes.json();
      if (Array.isArray(data.models)) {
        const activeModels = data.models
          .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => (m.name || "").replace(/^models\//, ""))
          .filter((name) => /flash/i.test(name) && !/(image|tts|audio|live|embed|vision|8b)/i.test(name));
        if (activeModels.length > 0) {
          return Array.from(new Set([...activeModels, ...fallback]));
        }
      }
    }
  } catch (e) {
    // Fall back to static list
  }
  return fallback;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health check
    if (path === "/" || path === "/health") {
      return jsonResponse({
        ok: true,
        service: "AskPeply Central License & AI Gateway",
        version: "1.1.0",
      });
    }

    // 2. Verify License & Bind Domain
    if (path === "/api/verify-license" && request.method === "POST") {
      try {
        const body = await request.json();
        const licenseKey = (body.licenseKey || "").trim().toUpperCase();
        const siteDomain = normalizeDomain(body.domain || request.headers.get("Origin") || request.headers.get("Referer"));

        // Free Tier Check
        if (!licenseKey || licenseKey === "FREE") {
          if (!siteDomain) {
            return jsonResponse({ ok: false, error: "missing_domain", message: "Domain is required for free tier." }, 400);
          }

          let freeLic = await env.DB.prepare("SELECT * FROM licenses WHERE bound_domain = ? AND plan = 'free'")
            .bind(siteDomain)
            .first();

          if (!freeLic) {
            const freeKey = `FREE-${siteDomain.toUpperCase()}`;
            await env.DB.prepare(
              "INSERT INTO licenses (license_key, email, plan, bound_domain, chat_limit, chats_used, status) VALUES (?, ?, 'free', ?, 20, 0, 'active')"
            ).bind(freeKey, `free@${siteDomain}`, siteDomain).run();

            freeLic = { plan: "free", chat_limit: 20, chats_used: 0, bound_domain: siteDomain, status: "active" };
          }

          return jsonResponse({
            ok: true,
            plan: "free",
            chatLimit: freeLic.chat_limit,
            chatsUsed: freeLic.chats_used,
            boundDomain: siteDomain,
            status: "active"
          });
        }

        // Paid License Key Verification (Case-Insensitive)
        const stmt = env.DB.prepare("SELECT * FROM licenses WHERE UPPER(license_key) = UPPER(?)");
        const license = await stmt.bind(licenseKey).first();

        if (!license) {
          return jsonResponse({ ok: false, error: "invalid_key", message: "Invalid license key. Please check and try again." }, 404);
        }

        if (license.status !== "active") {
          return jsonResponse({ ok: false, error: "inactive", message: `This license is ${license.status}.` }, 403);
        }

        // Strict 30-Day Monthly Expiration Check
        if (license.expires_at) {
          const exp = new Date(license.expires_at);
          if (exp < new Date()) {
            return jsonResponse({
              ok: false,
              error: "expired",
              message: "Your 1-month license subscription has expired. Please renew on AskPeply to continue."
            }, 403);
          }
        }

        // Domain Locking Logic:
        // Test keys (e.g. ASK-PRO-TEST-9999) can be used on any domain without getting locked.
        const isTestKey = licenseKey.includes("TEST");

        if (license.bound_domain && !isTestKey) {
          if (siteDomain && license.bound_domain !== siteDomain) {
            return jsonResponse({
              ok: false,
              error: "domain_mismatch",
              message: `This license is already bound to domain: ${license.bound_domain}. It cannot be used on another store.`,
            }, 403);
          }
        } else if (siteDomain && !isTestKey) {
          await env.DB.prepare("UPDATE licenses SET bound_domain = ? WHERE id = ?")
            .bind(siteDomain, license.id)
            .run();
          license.bound_domain = siteDomain;
        }

        return jsonResponse({
          ok: true,
          plan: license.plan,
          chatLimit: license.chat_limit,
          chatsUsed: license.chats_used,
          boundDomain: license.bound_domain || siteDomain,
          status: license.status,
          expiresAt: license.expires_at || null,
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: "server_error", message: err.message }, 500);
      }
    }

    // 3. AI Chat Proxy (With Monthly Expiration, Domain Lock & Anti-Abuse)
    if (path === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const licenseKey = (body.licenseKey || "").trim().toUpperCase();
        const siteDomain = normalizeDomain(body.domain || request.headers.get("Origin") || request.headers.get("Referer"));
        const { system, messages, isTest } = body;

        let license = null;
        let isFreeTier = false;

        if (!licenseKey || licenseKey === "FREE" || licenseKey.startsWith("FREE-")) {
          isFreeTier = true;
          if (!siteDomain) {
            return jsonResponse({ ok: false, error: "missing_domain", reply: "Site domain is required for free trial." }, 400);
          }

          license = await env.DB.prepare("SELECT * FROM licenses WHERE bound_domain = ? AND plan = 'free'")
            .bind(siteDomain)
            .first();

          if (!license) {
            const freeKey = `FREE-${siteDomain.toUpperCase()}`;
            await env.DB.prepare(
              "INSERT INTO licenses (license_key, email, plan, bound_domain, chat_limit, chats_used, status) VALUES (?, ?, 'free', ?, 20, 0, 'active')"
            ).bind(freeKey, `free@${siteDomain}`, siteDomain).run();

            license = { license_key: freeKey, plan: "free", bound_domain: siteDomain, chat_limit: 20, chats_used: 0, status: "active" };
          }
        } else {
          license = await env.DB.prepare("SELECT * FROM licenses WHERE UPPER(license_key) = UPPER(?)")
            .bind(licenseKey)
            .first();

          if (!license || license.status !== "active") {
            return jsonResponse({ ok: false, error: "unauthorized", reply: "License key is invalid or inactive." }, 403);
          }

          // Check monthly expiration on chat turns
          if (license.expires_at) {
            const exp = new Date(license.expires_at);
            if (exp < new Date()) {
              return jsonResponse({
                ok: false,
                error: "expired",
                limit_reached: true,
                reply: "Your AskPeply license subscription has expired. Please renew your plan on AskPeply to continue using the assistant."
              }, 403);
            }
          }

          // Domain binding check for chat
          const isTestKey = licenseKey.includes("TEST");
          if (license.bound_domain && siteDomain && license.bound_domain !== siteDomain && !isTestKey) {
            return jsonResponse({ ok: false, error: "domain_mismatch", reply: "License key domain mismatch." }, 403);
          }
        }

        // Check conversation limits
        if (!isTest && license.chats_used >= license.chat_limit) {
          const limitMsg = isFreeTier
            ? "You have reached the 20 free conversations limit. Please upgrade your plan on AskPeply to continue using the assistant."
            : "Our assistant has reached its monthly conversation limit. Please upgrade your plan or contact support.";

          return jsonResponse({ ok: false, error: "limit_reached", limit_reached: true, reply: limitMsg }, 429);
        }

        if (!isTest) {
          await env.DB.prepare("UPDATE licenses SET chats_used = chats_used + 1 WHERE id = ?").bind(license.id).run();
        }

        // Read Gemini API key from Cloudflare Variables and Secrets
        const apiKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : null;

        if (!apiKey) {
          return jsonResponse({
            ok: false,
            error: "no_api_key",
            reply: "Central AI key not configured on server. Please add GEMINI_API_KEY in Cloudflare Worker Settings > Variables and Secrets."
          }, 500);
        }

        const contents = (messages || []).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content || "" }],
        }));

        const candidateModels = await getGeminiCandidateModels(apiKey);
        let aiReply = null;
        let lastError = null;

        for (const model of candidateModels) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          };

          try {
            const gRes = await fetch(geminiUrl, {
              method: "POST",
              headers,
              body: JSON.stringify({
                systemInstruction: system ? { parts: [{ text: system }] } : undefined,
                contents,
                generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
              }),
            });

            if (gRes.ok) {
              const data = await gRes.json();
              const textParts = data.candidates?.[0]?.content?.parts || [];
              aiReply = textParts.filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim();
              if (aiReply) break;
            } else {
              lastError = await gRes.text();
            }
          } catch (e) {
            lastError = e.message;
          }
        }

        if (!aiReply) {
          return jsonResponse({
            ok: false,
            error: "ai_upstream_error",
            reply: "I am having trouble answering right now. Please try again shortly.",
            detail: lastError,
          }, 502);
        }

        return jsonResponse({
          ok: true,
          reply: aiReply,
          chatsRemaining: Math.max(0, license.chat_limit - (license.chats_used + 1)),
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: "chat_error", reply: "Internal server error.", detail: err.message }, 500);
      }
    }

    // 4. Shopify Webhook Endpoint (Order payment)
    if (path === "/api/webhook/shopify" && request.method === "POST") {
      try {
        const order = await request.json();
        const email = order.email || order.customer?.email || "unknown@customer.com";
        const lineItems = order.line_items || [];

        let plan = "starter";
        let chatLimit = 1000;

        for (const item of lineItems) {
          const title = (item.title || "").toLowerCase();
          const variant = (item.variant_title || "").toLowerCase();
          const combined = `${title} ${variant}`;

          if (combined.includes("pro")) {
            plan = "pro";
            chatLimit = 20000;
            break;
          } else if (combined.includes("growth")) {
            plan = "growth";
            chatLimit = 5000;
            break;
          }
        }

        const newKey = generateLicenseKey(plan);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 Days (1 Month)

        await env.DB.prepare(
          "INSERT INTO licenses (license_key, email, plan, chat_limit, status, expires_at) VALUES (?, ?, ?, ?, 'active', ?)"
        )
          .bind(newKey, email, plan, chatLimit, expiresAt.toISOString().replace("T", " ").substring(0, 19))
          .run();

        // Optional: Send email via Resend if RESEND_API_KEY secret is configured
        if (env.RESEND_API_KEY && email && email !== "unknown@customer.com") {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: env.RESEND_FROM_EMAIL || "AskPeply <onboarding@resend.dev>",
                to: email,
                subject: `Your AskPeply ${plan.toUpperCase()} License Key`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <h2 style="color: #7C3AED; margin-top: 0;">Thank you for your purchase!</h2>
                    <p style="color: #334155; font-size: 15px;">Your AskPeply AI Assistant <strong>${plan.toUpperCase()}</strong> 1-month subscription is now active.</p>
                    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; border-radius: 8px; margin: 24px 0; text-align: center;">
                      <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Your License Key</div>
                      <div style="font-family: monospace; font-size: 24px; font-weight: bold; color: #0f172a; margin-top: 8px; letter-spacing: 1px;">
                        ${newKey}
                      </div>
                    </div>
                    <p style="color: #475569; font-size: 14px; font-weight: 600;">How to activate your license in WordPress:</p>
                    <ol style="color: #475569; font-size: 14px; line-height: 1.7; padding-left: 20px;">
                      <li>Log in to your WordPress Admin dashboard.</li>
                      <li>Click on <strong>AskPeply &rarr; Plans & Licensing</strong> in the left sidebar.</li>
                      <li>Paste your key above into the box and click <strong>Activate License</strong>.</li>
                    </ol>
                    <p style="color: #64748b; font-size: 13px;">This license is valid for 30 days and locks to your store domain upon activation.</p>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error("Resend delivery error:", emailErr);
          }
        }

        return jsonResponse({ ok: true, message: "License created successfully", licenseKey: newKey, plan, email, expiresAt: expiresAt.toISOString() });
      } catch (err) {
        return jsonResponse({ ok: false, error: "webhook_error", message: err.message }, 500);
      }
    }

    // 5. Admin List Licenses Endpoint
    if (path === "/api/admin/licenses" && request.method === "GET") {
      try {
        const stmt = env.DB.prepare("SELECT * FROM licenses ORDER BY id DESC LIMIT 50");
        const rows = await stmt.all();
        return jsonResponse({ ok: true, licenses: rows.results || [] });
      } catch (err) {
        return jsonResponse({ ok: false, error: "db_error", message: err.message }, 500);
      }
    }

    // 6. Gemini Health Check Endpoint (1-Click Browser Test)
    if (path === "/api/test-gemini" && request.method === "GET") {
      const apiKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : null;
      if (!apiKey) {
        return jsonResponse({
          ok: false,
          error: "no_key",
          message: "GEMINI_API_KEY is not set in Cloudflare Worker Settings > Variables and Secrets."
        }, 500);
      }

      const candidateModels = await getGeminiCandidateModels(apiKey);
      let result = null;
      let lastErr = null;

      for (const model of candidateModels) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const headers = {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        };

        try {
          const gRes = await fetch(geminiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Hello! Reply with the single word: SUCCESS" }] }]
            })
          });

          const data = await gRes.text();
          if (gRes.ok) {
            result = { model, response: data };
            break;
          } else {
            lastErr = { status: gRes.status, model, response: data };
          }
        } catch (e) {
          lastErr = { error: e.message };
        }
      }

      if (result) {
        return jsonResponse({
          ok: true,
          message: "Gemini API is WORKING perfectly in Cloudflare!",
          keyPrefix: apiKey.substring(0, 8) + "...",
          testedModel: result.model,
          geminiOutput: result.response
        });
      }

      return jsonResponse({
        ok: false,
        message: "Gemini API rejected the key configured in Cloudflare Worker.",
        keyPrefix: apiKey.substring(0, 8) + "...",
        googleError: lastErr
      }, 502);
    }

    return jsonResponse({ ok: false, error: "not_found", message: "Endpoint not found" }, 404);
  },
};
