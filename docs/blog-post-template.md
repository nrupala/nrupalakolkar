# Blog post template — "Built with Muse" (nrupalakolkar.com/blog)

Internal checklist for drafting a new post. Public copy rules apply to every post.

## 1. Pick the material
- Source: real work done with Muse. Distill the useful pattern, tip, or trick.
- Never include conversational details, private data, credentials, or anything
  said along the way. The work goes public; the conversation stays private.

## 2. Copy rules (standing)
- Poised, subtle, inviting, non-salesy. State process and outcomes, not biography.
- "24+ years" (with the plus). No negatives about others, no absolutes.
- The word "never" is banned in public copy.
- Name industries, not employers.
- Title stays out of founder language: Independent Open-Source Builder.
- Language bar (2026-09-26): never cheap or slangy. Least words, most
  meaning — clarity is king. No hype, no cute phrasing, no
  anthropomorphized technology. Write like the devinfo.dev notes:
  short declarative sentences, concrete nouns, active verbs, and a
  crisp closing line that states the takeaway.

## 3. File layout
- New post: `public/blog/<slug>/index.html` (slug: lowercase, hyphens).
- Copy `public/blog/firefox-ssl-ech-fix/index.html` as the starting point.
- Replace: `<title>`, meta description, canonical, og:/twitter: tags,
  `article:published_time`, h1, date line, all section blocks, footer URL.
- Keep: the style block (add page-specific classes only if needed),
  top-bar, header shell, support-block, links-row, more-block, footer shell.

## 4. Required blocks in every post
- Header: name link, h1 title, byline (`P.Eng.` — 24+ years…), date + "Built with Muse".
- Body: `.section-title` + `.prose` sections. Code goes in `.codeblock`.
- Support block (exact links):
  - `https://paypal.me/nrupalakolkar` (Tip via PayPal)
  - `https://buymeacoffee.com/nrupalakolt` (Buy Me a Coffee)
- References section (`.section-title` "References" + ordered `.refs` list):
  every entry comes from `docs/blog-references.md` — never a drive-by link.
- Related posts: a "More from the blog" block linking at least one related
  post, once a related post exists (leave an HTML comment placeholder until then).
- links-row: All posts, Home, All links, Consulting.
- Footer: `© 2026 Nrupal Akolkar` + page URL.
- Layout: three-panel shell — left "More from the blog" nav, article center,
  right "Actions" panel (Contact, Bookmark this article, Share).

## 5. Blog index (`public/blog/index.html`)
- Add a `.post-item` block at the TOP of the Posts section (newest first):
  link, date, one-paragraph description.
- Archive rule: group posts under month headings (`.arch-month`, newest
  month first); add the month to the left-panel Archive nav with its post
  count. Layout stays three-panel: Archive left, posts center, Actions right.

## 6. Sitemap (`public/sitemap.xml`)
- Add the post URL: `<loc>https://nrupalakolkar.com/blog/<slug></loc>`,
  current date, `monthly`, priority `0.7`.
- Bump `/blog` lastmod to the post date.

## 7. References rule (`docs/blog-references.md`)
- Three verified references minimum per post, or the topic does not ship.
- Cite only registry entries. Every URL curl-verified (HTTP 200) before
  publish; re-verify refs older than 90 days before reuse.
- Tiers: A = official docs/specs/RFCs, B = vendor engineering blogs,
  C = reputable tech press/community. Prefer A, then B, then C.
- Add new entries to the registry table with verified date and post slug.

## 8. Publish flow
1. Muse drafts the post → Nrupal reviews (nothing publishes without his eyes).
2. PR against main → Nrupal merges → deploy.
3. Muse drafts the X post text (link + tags: Muse's handle and any service
   featured, e.g. @Cloudflare) → Nrupal sends from his phone (manual route).
4. Homepage nav link: `index.html` was deliberately left untouched to avoid
   conflicts — add the Blog link to the nav in a separate pass once open PRs
   touching index.html are clear.
