# Blog references registry — nrupalakolkar.com/blog

Mirrors the discipline of the aimlds.org / devinfo.dev blog: every factual
claim that leans on an outside source cites a registry entry, and every
registry URL is verified before it ships.

## Voice

Every post is also measured against [blog-voice-guardrails.md](blog-voice-guardrails.md) before publishing: the language bar (never cheap or slangy — least words most meaning — clarity is king), the public-copy doctrine, and the board-bio lessons. One converged voice across resume, board bio, LinkedIn, and blog.

## Rules

1. **Three references minimum per post.** If a topic cannot cite three
   verified sources, the topic does not ship.
2. **Cite only entries in this registry.** No drive-by links, no bare URLs
   invented at draft time.
3. **Every URL is curl-verified (HTTP 200) on the date listed.** A reference
   older than 90 days is re-verified before reuse; dead or moved links are
   replaced, not kept.
4. **Tiers** — A: official docs, specs, RFCs. B: vendor engineering blogs.
   C: reputable tech press and community sources. Prefer A, then B, then C.
5. **Cross-links.** Every post links to at least one related post on /blog
   in its "More from the blog" block, once a related post exists. New posts
   are added to the archive on the blog index (year → month, newest first).

## Entries

| ID | Tier | Title | Publisher | URL | Verified | Used in |
|----|------|-------|-----------|-----|----------|---------|
| r-ech-01 | B | Good-bye ESNI, hello ECH! | Cloudflare Blog | https://blog.cloudflare.com/encrypted-client-hello/ | 2026-09-26 | firefox-ssl-ech-fix |
| r-ech-02 | A | ECH Protocol | Cloudflare SSL/TLS docs | https://developers.cloudflare.com/ssl/edge-certificates/ech/ | 2026-09-26 | firefox-ssl-ech-fix |
| r-https-01 | A | RFC 9460: Service Binding and Parameter Specification via the DNS (SVCB and HTTPS Resource Records) | IETF | https://www.rfc-editor.org/rfc/rfc9460.html | 2026-09-26 | firefox-ssl-ech-fix |
| r-io-01 | A | IntersectionObserver | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver | 2026-09-27 | fixed-axis-timeline |
| r-raf-01 | A | Window: requestAnimationFrame() | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | 2026-09-27 | fixed-axis-timeline |
| r-prm-01 | A | prefers-reduced-motion | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | 2026-09-27 | fixed-axis-timeline |
| r-html-01 | A | Scripting | WHATWG HTML Standard | https://html.spec.whatwg.org/multipage/scripting.html | 2026-09-28 | dont-escape-script-in-workers |
| r-cfw-01 | A | Cloudflare Workers documentation | Cloudflare Docs | https://developers.cloudflare.com/workers/ | 2026-09-28 | dont-escape-script-in-workers |
| r-mdnscript-01 | A | <script>: The Script element | MDN Web Docs | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script | 2026-09-28 | dont-escape-script-in-workers |
