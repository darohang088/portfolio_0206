// Retrace: turn an obfuscated Android stack trace back into readable class, method, file and line
// names using the mapping.txt that R8 / ProGuard writes for a release build. Runs in the browser.
//
// mapping.txt in short:
//   com.example.Original -> a.b:                         a class and its obfuscated name
//   # {"id":"sourceFile","fileName":"Original.kt"}       optional: the real source file
//       java.lang.String field -> a                      a field (not needed for stack traces)
//       1:3:void run(int):10:12 -> b                     a method: obfuscated lines 1-3 are original lines 10-12
//       4:4:void helper():40:40 -> b                     lines with the SAME obfuscated range form an inline chain:
//       4:4:void run(int):15 -> b                         first the inlined method, then the method it was inlined into
//       void other() -> c                                a method without line info

export type MappedMethod = {
  obfStart: number; // obfuscated line range (0 = no range)
  obfEnd: number;
  cls: string | null; // set when the method comes from another class (inlined from elsewhere)
  name: string;
  args: string;
  origStart: number; // original line range (0 = unknown)
  origEnd: number;
};
export type MappedClass = { name: string; file: string | null; methods: Map<string, MappedMethod[]> };
export type Mapping = { classes: Map<string, MappedClass>; compiler: string | null; mapId: string | null; classCount: number; methodCount: number };

const CLASS_LINE = /^(\S+) -> (\S+):$/;
const METHOD_LINE = /^\s+(?:(\d+):(\d+):)?([^\s(]+) ([^\s(]+)\(([^)]*)\)(?::(\d+)(?::(\d+))?)? -> (\S+)$/;
const SOURCE_FILE = /^\s*# \{.*"id"\s*:\s*"sourceFile".*"fileName"\s*:\s*"([^"]+)"/;

// A parser you feed line by line, so big files can be read in chunks without freezing the page.
export function createMappingParser() {
  const m: Mapping = { classes: new Map(), compiler: null, mapId: null, classCount: 0, methodCount: 0 };
  let cur: MappedClass | null = null;
  return {
    line(raw: string) {
      if (!raw) return;
      const c0 = raw.charCodeAt(0);
      if (c0 === 35 /* # */) {
        if (cur && !cur.file) {
          const f = SOURCE_FILE.exec(raw);
          if (f) cur.file = f[1];
        }
        if (!m.compiler && raw.startsWith("# compiler: ")) m.compiler = raw.slice(12).trim();
        if (!m.mapId && raw.startsWith("# pg_map_id: ")) m.mapId = raw.slice(13).trim();
        return;
      }
      if (c0 === 32 || c0 === 9) {
        if (!cur) return;
        const t = raw.trimStart();
        if (t.startsWith("#")) {
          if (!cur.file) {
            const f = SOURCE_FILE.exec(t);
            if (f) cur.file = f[1];
          }
          return;
        }
        const x = METHOD_LINE.exec(raw);
        if (!x) return; // a field, or something we don't need
        const full = x[4];
        const dot = full.lastIndexOf(".");
        const method: MappedMethod = {
          obfStart: x[1] ? +x[1] : 0,
          obfEnd: x[2] ? +x[2] : 0,
          cls: dot > 0 ? full.slice(0, dot) : null,
          name: dot > 0 ? full.slice(dot + 1) : full,
          args: x[5],
          origStart: x[6] ? +x[6] : 0,
          origEnd: x[7] ? +x[7] : x[6] ? +x[6] : 0,
        };
        const list = cur.methods.get(x[8]);
        if (list) list.push(method);
        else cur.methods.set(x[8], [method]);
        m.methodCount++;
        return;
      }
      const c = CLASS_LINE.exec(raw);
      if (c) {
        cur = { name: c[1], file: null, methods: new Map() };
        m.classes.set(c[2], cur);
        m.classCount++;
      }
    },
    done: () => m,
  };
}

export function parseMapping(text: string): Mapping {
  const p = createMappingParser();
  for (const l of text.split(/\r?\n/)) p.line(l);
  return p.done();
}

// Read a mapping file in chunks, reporting progress, so a 100 MB file doesn't lock up the tab.
export async function parseMappingFile(file: Blob, onProgress?: (done: number, total: number) => void): Promise<Mapping> {
  const p = createMappingParser();
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let rest = "";
  let read = 0;
  let lastYield = Date.now();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    read += value.length;
    const lines = (rest + value).split(/\r?\n/);
    rest = lines.pop() ?? "";
    for (const l of lines) p.line(l);
    if (Date.now() - lastYield > 40) {
      onProgress?.(Math.min(read, file.size), file.size);
      await new Promise((r) => setTimeout(r, 0));
      lastYield = Date.now();
    }
  }
  if (rest) p.line(rest);
  onProgress?.(file.size, file.size);
  return p.done();
}

// ---------- retracing ----------

export type Frame = { cls: string; method: string; file: string; line: number | null; inlined: boolean };
export type OutLine =
  | { kind: "text"; text: string; changed: boolean } // exception headers and other lines
  | { kind: "frame"; indent: string; at: boolean; frames: Frame[]; alternatives: Frame[][]; original: string; mapped: boolean };
export type RetraceResult = { lines: OutLine[]; frames: number; mapped: number; ambiguous: number };

// "    at a.b.c(SourceFile:12)", "at a.b.c(Unknown Source:3)", "a.b.c (SourceFile:12)" (Crashlytics), "at a.b.c(:12)"
const FRAME = /^(\s*)(at\s+)?((?:[\w$]+\.)*[\w$]+)\.([\w$<>-]+)\s*\(([^)]*)\)\s*$/;
// Dotted names that might be obfuscated classes inside messages ("Caused by: a.b.c: ...").
const DOTTED = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\b/g;

const simpleFile = (cls: string) => {
  const outer = cls.slice(cls.lastIndexOf(".") + 1).split("$")[0];
  return `${outer}.java`;
};

// Source file for an original class name: its sourceFile entry if the mapping has one, else Outer.java.
function fileLookup(m: Mapping) {
  const byName = new Map<string, string | null>();
  return (cls: string, fallback: MappedClass | null) => {
    if (fallback && fallback.name === cls) return fallback.file ?? simpleFile(cls);
    if (!byName.has(cls)) {
      let f: string | null = null;
      for (const c of m.classes.values())
        if (c.name === cls) {
          f = c.file;
          break;
        }
      byName.set(cls, f);
    }
    return byName.get(cls) ?? simpleFile(cls);
  };
}

const origLine = (mm: MappedMethod, obfLine: number | null): number | null => {
  if (!mm.origStart) return obfLine; // no original line given: the line number wasn't changed
  if (obfLine === null || !mm.obfStart) return mm.origStart;
  // A range maps line for line; a single original line (inline call site) stays the same.
  if (mm.origEnd > mm.origStart && mm.origEnd - mm.origStart === mm.obfEnd - mm.obfStart) return mm.origStart + (obfLine - mm.obfStart);
  return mm.origStart;
};

// Group a class's entries for one obfuscated method name into inline chains (same obfuscated range).
function chains(list: MappedMethod[]): MappedMethod[][] {
  const out: MappedMethod[][] = [];
  for (const mm of list) {
    const last = out[out.length - 1];
    if (last && mm.obfStart && last[0].obfStart === mm.obfStart && last[0].obfEnd === mm.obfEnd) last.push(mm);
    else out.push([mm]);
  }
  return out;
}

export function retrace(m: Mapping, trace: string): RetraceResult {
  const lines: OutLine[] = [];
  const fileOf = fileLookup(m);
  let frames = 0;
  let mapped = 0;
  let ambiguous = 0;

  for (const raw of trace.replace(/\r\n?/g, "\n").split("\n")) {
    const f = FRAME.exec(raw);
    if (f) {
      frames++;
      const [, indent, atWord, obfCls, obfMethod, where] = f;
      const at = !!atWord;
      const lineMatch = /(?:^|:)(\d+)$/.exec(where.trim());
      const obfLine = lineMatch ? +lineMatch[1] : null;
      const mc = m.classes.get(obfCls);
      if (!mc) {
        lines.push({ kind: "frame", indent, at, frames: [], alternatives: [], original: raw, mapped: false });
        continue;
      }
      const list = mc.methods.get(obfMethod) ?? [];
      let candidates = chains(list);
      if (obfLine !== null) {
        const inRange = candidates.filter((ch) => ch[0].obfStart && obfLine >= ch[0].obfStart && obfLine <= ch[0].obfEnd);
        if (inRange.length) candidates = inRange;
        else {
          // No range covers this line: prefer entries without ranges, otherwise keep every candidate.
          const noRange = candidates.filter((ch) => !ch[0].obfStart);
          if (noRange.length) candidates = noRange;
        }
      }
      // The same original method can appear several times (different line ranges): de-duplicate.
      const seen = new Set<string>();
      const options = candidates
        .map((ch) =>
          ch.map((mm, i) => {
            const cls = mm.cls ?? mc.name;
            return { cls, method: mm.name, file: fileOf(cls, mc), line: origLine(mm, obfLine), inlined: i < ch.length - 1 } satisfies Frame;
          }),
        )
        .filter((fr) => {
          const key = fr.map((x) => `${x.cls}.${x.method}:${obfLine === null ? "" : x.line}`).join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (!options.length) {
        // Class is known but not the method (e.g. a synthetic or kept name): at least fix the class and file.
        options.push([{ cls: mc.name, method: obfMethod, file: mc.file ?? simpleFile(mc.name), line: obfLine, inlined: false }]);
      }
      mapped++;
      if (options.length > 1) ambiguous++;
      lines.push({ kind: "frame", indent, at, frames: options[0], alternatives: options.slice(1), original: raw, mapped: true });
      continue;
    }
    // Other lines (exception headers, "Caused by:", "... 12 more"): rename obfuscated classes in them.
    let changed = false;
    const text = raw.replace(DOTTED, (tok) => {
      const mc = m.classes.get(tok);
      if (!mc || mc.name === tok) return tok;
      changed = true;
      return mc.name;
    });
    lines.push({ kind: "text", text, changed });
  }
  return { lines, frames, mapped, ambiguous };
}

// "at" is kept only when the input line had it (Crashlytics copies leave it out).
export const frameText = (indent: string, f: Frame, at = true) => `${indent}${at ? "at " : ""}${f.cls}.${f.method}(${f.file}${f.line !== null ? `:${f.line}` : ""})`;

// Plain-text result, the way the official retrace tool prints it (alternatives as "or" lines).
export function resultText(r: RetraceResult): string {
  const out: string[] = [];
  for (const l of r.lines) {
    if (l.kind === "text") out.push(l.text);
    else if (!l.mapped) out.push(l.original);
    else {
      const ind = l.indent;
      for (const f of l.frames) out.push(frameText(ind, f, l.at));
      for (const alt of l.alternatives) {
        alt.forEach((f, i) => out.push(i === 0 ? `${ind}or ${frameText("", f, false)}` : frameText(ind, f, l.at)));
      }
    }
  }
  return out.join("\n");
}

