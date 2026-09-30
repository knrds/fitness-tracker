const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Preserve newlines so diagnostics still identify the original source line.
const blank = (value) => value.replace(/[^\r\n]/g, ' ');

function stripCode(markdown) {
  let fence = null;
  const withoutFences = markdown.split('\n').map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length
        && line.slice(marker[0].length).trim() === '') fence = null;
      return blank(line);
    }
    if (marker) {
      fence = marker[1];
      return blank(line);
    }
    return line;
  }).join('\n');
  return withoutFences.replace(/<!--[^]*?-->/g, blank)
    .replace(/(`+)([^]*?)\1(?!`)/g, blank);
}

function readDestination(text, start) {
  let index = start;
  while (/\s/.test(text[index] ?? '') && index < text.length) index += 1;
  const angled = text[index] === '<';
  if (angled) index += 1;
  const beginning = index;
  let depth = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\' && index + 1 < text.length) {
      index += 2;
      continue;
    }
    if (angled) {
      if (char === '>') return text.slice(beginning, index);
      if (char === '\n') return null;
    } else {
      if (char === '(') depth += 1;
      if (char === ')') {
        if (depth === 0) break;
        depth -= 1;
      }
      if (/\s/.test(char) && depth === 0) break;
    }
    index += 1;
  }
  return angled ? null : text.slice(beginning, index);
}

function localLinks(markdown) {
  const source = stripCode(markdown);
  const links = [];
  // Inline links/images and reference definitions share the same destination syntax.
  for (const pattern of [/!?\[[^\]\n]*\]\(/g, /^ {0,3}\[[^\]\n]+\]:\s*/gm]) {
    for (const match of source.matchAll(pattern)) {
      const destination = readDestination(source, match.index + match[0].length);
      if (destination !== null && destination !== '') {
        links.push({ destination, line: source.slice(0, match.index).split('\n').length });
      }
    }
  }
  return links;
}

function staysInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function checkDocument(root, file, markdown) {
  const errors = [];
  const realRoot = fs.realpathSync(root);
  for (const { destination, line } of localLinks(markdown)) {
    const unescaped = destination.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1');
    // External URLs are intentionally never requested. Local absolute paths are rejected.
    if (unescaped.startsWith('//') || /^(?:https?|mailto|tel|data):/i.test(unescaped)) continue;
    if (unescaped.startsWith('#')) continue;
    if (/^[a-z][a-z\d+.-]*:/i.test(unescaped)) {
      if (!/^file:/i.test(unescaped) && !/^[a-z]:[\\/]/i.test(unescaped)) continue;
      errors.push(`${file}:${line}: absolute local link is not portable: ${destination}`);
      continue;
    }
    let target;
    try {
      target = decodeURIComponent(unescaped.split(/[?#]/, 1)[0]);
    } catch {
      errors.push(`${file}:${line}: invalid URL encoding: ${destination}`);
      continue;
    }
    if (!target) continue;
    if (path.isAbsolute(target) || /^[a-z]:[\\/]/i.test(target)) {
      errors.push(`${file}:${line}: absolute local link is not portable: ${destination}`);
      continue;
    }
    const resolved = path.resolve(root, path.dirname(file), target.replace(/\\/g, '/'));
    if (!staysInside(root, resolved)) {
      errors.push(`${file}:${line}: link escapes repository: ${destination}`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${file}:${line}: missing local target: ${destination}`);
    } else if (!staysInside(realRoot, fs.realpathSync(resolved))) {
      errors.push(`${file}:${line}: link follows a symlink outside repository: ${destination}`);
    }
  }
  return errors;
}

function checkRepository(root) {
  root = path.resolve(root);
  const candidates = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard',
    '--', '*.md', '*.mdx'], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const files = [...new Set(candidates.split('\0').filter(Boolean))]
    .filter((file) => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile());
  const errors = files.flatMap((file) => checkDocument(root, file, fs.readFileSync(path.join(root, file), 'utf8')));
  return { files, errors };
}

if (require.main === module) {
  try {
    const { files, errors } = checkRepository(path.resolve(__dirname, '..'));
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`Documentation links: ${files.length} Markdown files checked; all local targets exist.`);
    }
  } catch (error) {
    console.error(`Documentation check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { checkDocument, checkRepository };
