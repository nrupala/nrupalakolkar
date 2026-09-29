// verify-worker-html.mjs
// Pre-publish check for Worker-served HTML pages.
// Catches the escaped-</script> bug: a Worker source file is pure JavaScript,
// never parsed as HTML, so '<\\/script>' survives into the served bytes.
// Browsers do not recognize it as a closing tag, and the first script
// element swallows the rest of the document.
// From: https://nrupalakolkar.com/blog/dont-escape-script-in-workers
// Usage: node verify-worker-html.mjs https://example.com/page

const url = process.argv[2];
if (!url) {
  console.error('usage: node verify-worker-html.mjs <url>');
  process.exit(2);
}

const html = await (await fetch(url)).text();
const problems = [];

if (html.includes('<\\/script>')) {
  problems.push("escaped <\\/script> in served bytes — write '</script>' literally in Worker templates");
}

const opens = (html.match(/<script(?=[\s>])/g) || []).length;
const closes = (html.match(/<\/script\s*>/g) || []).length;
if (opens !== closes) {
  problems.push(`unbalanced script tags: ${opens} opening, ${closes} closing`);
}

if (problems.length) {
  console.error('FAIL');
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log(`OK: ${html.length} bytes, ${opens}/${closes} script tags balanced`);
