import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cssHref, fontHref, header, footer } from "./chrome.mjs";

const root = new URL("..", import.meta.url).pathname;
const skip = new Set(["find-a-pro.html"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "functions") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".html") && !skip.has(name)) out.push(path);
  }
  return out;
}

function activeFor(path) {
  const rel = path.slice(root.length).replace(/^\//, "");
  if (rel.startsWith("locations/")) return "locations";
  if (rel === "suites.html") return "suites";
  if (rel === "earnings.html") return "earnings";
  if (rel === "faq.html") return "faq";
  return "";
}

function swap(html, path) {
  const head = header(activeFor(path));
  const foot = footer({ sticky: !html.includes("pro-sticky") && !html.includes("store-page") });
  let next = html;
  if (next.includes("<!-- site-header -->")) {
    next = next.replace(/<!-- site-header -->[\s\S]*?<!-- \/site-header -->/, head);
  } else {
    next = next.replace(/(?:<a class="skip"[\s\S]*?<\/a>\s*)?<nav>[\s\S]*?<\/nav>/, head);
  }
  if (next.includes("<!-- site-footer -->")) {
    next = next.replace(/<!-- site-footer -->[\s\S]*?<!-- \/site-footer -->/, foot);
  } else if (/<footer>[\s\S]*?<\/footer>/.test(next)) {
    next = next.replace(/<footer>[\s\S]*?<\/footer>(?:\s*<div class="msticky">[\s\S]*?<\/div>)?/, foot);
  } else if (next.includes('<div class="msticky">')) {
    next = next.replace(/<div class="msticky">[\s\S]*?<\/div>/, foot);
  } else {
    next = next.replace("</body>", foot + "\n</body>");
  }
  next = next.replace(/<link rel="stylesheet" href="(?:\.\.\/)?\/?styles\.css(?:\?[^"]*)?">/g, `<link rel="stylesheet" href="${cssHref}">`);
  next = next.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=[^"]+"[^>]*>/g, `<link rel="stylesheet" href="${fontHref}">`);
  next = next.replace(/<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=[^"]+"><\/noscript>\n?/g, "");
  next = next.replace(/src="\/(earnings-calc|locations|studio|find-a-pro)\.js(?:\?[^"]*)?"/g, (m, name) => `src="/${name}.js?v=${cssHref.split("v=")[1]}"`);
  next = next.replace(/<link rel="icon"[^>]*>\n?/g, "");
  next = next.replace(/<link rel="apple-touch-icon"[^>]*>\n?/g, "");
  next = next.replace("</head>", '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n</head>');
  return next;
}

for (const path of walk(root)) {
  const before = readFileSync(path, "utf8");
  const after = swap(before, path);
  if (after !== before) {
    writeFileSync(path, after);
    console.log("chrome", path.slice(root.length));
  }
}
