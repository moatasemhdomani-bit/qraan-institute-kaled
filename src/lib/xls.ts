/**
 * قارئ مصغّر لملفات Excel القديمة (.XLS — BIFF8 داخل حاوية CFB) بلا مكتبات خارجية.
 * يكفي لملفات البصّامة: يقرأ أسماء الأوراق وقيم الخلايا (نصوص وأرقام) فقط — لا تنسيق ولا صيغ.
 */

export type XlsSheet = { name: string; cells: Map<string, string | number> };

const key = (r: number, c: number) => `${r},${c}`;
export const xlsCell = (s: XlsSheet, r: number, c: number) => s.cells.get(key(r, c));

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;

/** يستخرج تيار «Workbook» (أو «Book») من حاوية CFB */
function workbookStream(buf: Buffer): Buffer {
  if (buf.length < 512 || buf.readUInt32LE(0) !== 0xe011cfd0 || buf.readUInt32LE(4) !== 0xe11ab1a1) {
    throw new Error("الملف ليس ملف Excel بصيغة .XLS");
  }
  const secSize = 1 << buf.readUInt16LE(0x1e);
  const miniSize = 1 << buf.readUInt16LE(0x20);
  const nFat = buf.readUInt32LE(0x2c);
  const dirStart = buf.readUInt32LE(0x30);
  const miniCutoff = buf.readUInt32LE(0x38);
  const miniFatStart = buf.readUInt32LE(0x3c);
  let difatSec = buf.readUInt32LE(0x44);
  const sector = (n: number) => buf.subarray((n + 1) * secSize, (n + 2) * secSize);

  // قائمة قطاعات FAT من DIFAT
  const fatSecs: number[] = [];
  for (let i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(buf.readUInt32LE(0x4c + i * 4));
  let guard = 0;
  while (fatSecs.length < nFat && difatSec !== ENDOFCHAIN && difatSec !== FREESECT && guard++ < 10000) {
    const s = sector(difatSec);
    const per = secSize / 4 - 1;
    for (let i = 0; i < per && fatSecs.length < nFat; i++) fatSecs.push(s.readUInt32LE(i * 4));
    difatSec = s.readUInt32LE(per * 4);
  }
  const fat: number[] = [];
  for (const fs of fatSecs) {
    const s = sector(fs);
    for (let i = 0; i < secSize / 4; i++) fat.push(s.readUInt32LE(i * 4));
  }
  const chain = (start: number): Buffer => {
    const parts: Buffer[] = [];
    let n = start;
    let g = 0;
    while (n !== ENDOFCHAIN && n !== FREESECT && n < fat.length && g++ < 1_000_000) {
      parts.push(sector(n));
      n = fat[n];
    }
    return Buffer.concat(parts);
  };

  // المجلد: مداخل بطول 128 بايت
  const dir = chain(dirStart);
  type Entry = { name: string; type: number; start: number; size: number };
  const entries: Entry[] = [];
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = dir.readUInt16LE(off + 0x40);
    const name = dir.subarray(off, off + Math.max(0, nameLen - 2)).toString("utf16le");
    entries.push({ name, type: dir[off + 0x42], start: dir.readUInt32LE(off + 0x74), size: dir.readUInt32LE(off + 0x78) });
  }
  const root = entries.find((e) => e.type === 5);
  const wb = entries.find((e) => e.type === 2 && (e.name === "Workbook" || e.name === "Book"));
  if (!wb) throw new Error("لم يُعثر على بيانات الجدول داخل الملف.");

  if (wb.size >= miniCutoff || !root) return chain(wb.start).subarray(0, wb.size);
  // تيار صغير: داخل التيار المصغّر
  const miniStream = chain(root.start);
  const miniFat: number[] = [];
  const mf = chain(miniFatStart);
  for (let i = 0; i + 4 <= mf.length; i += 4) miniFat.push(mf.readUInt32LE(i));
  const parts: Buffer[] = [];
  let n = wb.start;
  let g = 0;
  while (n !== ENDOFCHAIN && n !== FREESECT && g++ < 1_000_000) {
    parts.push(miniStream.subarray(n * miniSize, (n + 1) * miniSize));
    n = miniFat[n];
  }
  return Buffer.concat(parts).subarray(0, wb.size);
}

/** قيمة RK المضغوطة (رقم صحيح أو عشري) */
function rkValue(rk: number): number {
  let v: number;
  if (rk & 2) {
    v = rk >> 2;
  } else {
    const b = Buffer.alloc(8);
    b.writeUInt32LE((rk & 0xfffffffc) >>> 0, 4);
    v = b.readDoubleLE(0);
  }
  return rk & 1 ? v / 100 : v;
}

/** قارئ نصوص SST عبر سجلات CONTINUE: عند حدّ السجل داخل نص يُقرأ بايت خيارات جديد */
class Pieces {
  i = 0;
  off = 0;
  constructor(private parts: Buffer[]) {}
  private ensure() {
    while (this.i < this.parts.length && this.off >= this.parts[this.i].length) {
      this.i++;
      this.off = 0;
    }
  }
  byte(): number {
    this.ensure();
    return this.parts[this.i][this.off++];
  }
  u16(): number {
    return this.byte() | (this.byte() << 8);
  }
  u32(): number {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(n: number) {
    for (let k = 0; k < n; k++) this.byte();
  }
  chars(cch: number, high: boolean): string {
    let out = "";
    let wide = high;
    let left = cch;
    while (left > 0) {
      this.ensure();
      const cur = this.parts[this.i];
      const avail = Math.floor((cur.length - this.off) / (wide ? 2 : 1));
      if (avail <= 0) {
        // بداية سجل CONTINUE داخل النص: بايت خيارات يحدد عرض البقية
        this.i++;
        this.off = 0;
        wide = (this.byte() & 1) === 1;
        continue;
      }
      const take = Math.min(avail, left);
      const slice = cur.subarray(this.off, this.off + take * (wide ? 2 : 1));
      out += wide ? slice.toString("utf16le") : slice.toString("latin1");
      this.off += take * (wide ? 2 : 1);
      left -= take;
      if (left > 0 && this.off >= cur.length) {
        this.i++;
        this.off = 0;
        wide = (this.byte() & 1) === 1;
      }
    }
    return out;
  }
}

function readSst(parts: Buffer[]): string[] {
  const p = new Pieces(parts);
  p.u32(); // cstTotal
  const unique = p.u32();
  const out: string[] = [];
  for (let k = 0; k < unique; k++) {
    const cch = p.u16();
    const flags = p.byte();
    const rich = flags & 8 ? p.u16() : 0;
    const ext = flags & 4 ? p.u32() : 0;
    out.push(p.chars(cch, (flags & 1) === 1));
    p.skip(rich * 4 + ext);
  }
  return out;
}

/** نص XLUnicodeString داخل سجل واحد (LABEL) */
function xlString(b: Buffer, off: number): string {
  const cch = b.readUInt16LE(off);
  const high = (b[off + 2] & 1) === 1;
  const s = b.subarray(off + 3, off + 3 + cch * (high ? 2 : 1));
  return high ? s.toString("utf16le") : s.toString("latin1");
}

/** يقرأ كل أوراق الملف: الاسم وقيم الخلايا (صف وعمود من الصفر) */
export function readXls(buf: Buffer): XlsSheet[] {
  const wb = workbookStream(buf);
  const sheetsMeta: { name: string; pos: number }[] = [];
  let sst: string[] = [];

  // جولة أولى: سجلات المصنَّف حتى أول EOF
  let off = 0;
  while (off + 4 <= wb.length) {
    const type = wb.readUInt16LE(off);
    const len = wb.readUInt16LE(off + 2);
    const data = wb.subarray(off + 4, off + 4 + len);
    off += 4 + len;
    if (type === 0x0085) {
      const pos = data.readUInt32LE(0);
      const cch = data[6];
      const high = (data[7] & 1) === 1;
      const nm = data.subarray(8, 8 + cch * (high ? 2 : 1));
      sheetsMeta.push({ name: high ? nm.toString("utf16le") : nm.toString("latin1"), pos });
    } else if (type === 0x00fc) {
      const parts = [data];
      while (off + 4 <= wb.length && wb.readUInt16LE(off) === 0x003c) {
        const l = wb.readUInt16LE(off + 2);
        parts.push(wb.subarray(off + 4, off + 4 + l));
        off += 4 + l;
      }
      sst = readSst(parts);
    } else if (type === 0x000a) {
      break;
    }
  }

  return sheetsMeta.map(({ name, pos }) => {
    const cells = new Map<string, string | number>();
    let o = pos;
    let first = true;
    while (o + 4 <= wb.length) {
      const type = wb.readUInt16LE(o);
      const len = wb.readUInt16LE(o + 2);
      const d = wb.subarray(o + 4, o + 4 + len);
      o += 4 + len;
      if (type === 0x000a) break;
      if (first) {
        first = false;
        continue; // BOF
      }
      if (type === 0x00fd && len >= 10) cells.set(key(d.readUInt16LE(0), d.readUInt16LE(2)), sst[d.readUInt32LE(6)] ?? "");
      else if (type === 0x0204 && len >= 9) cells.set(key(d.readUInt16LE(0), d.readUInt16LE(2)), xlString(d, 6));
      else if (type === 0x0203 && len >= 14) cells.set(key(d.readUInt16LE(0), d.readUInt16LE(2)), d.readDoubleLE(6));
      else if (type === 0x027e && len >= 10) cells.set(key(d.readUInt16LE(0), d.readUInt16LE(2)), rkValue(d.readInt32LE(6)));
      else if (type === 0x00bd && len >= 6) {
        const row = d.readUInt16LE(0);
        const c0 = d.readUInt16LE(2);
        const n = (len - 6) / 6;
        for (let k = 0; k < n; k++) cells.set(key(row, c0 + k), rkValue(d.readInt32LE(4 + k * 6 + 2)));
      }
    }
    return { name, cells };
  });
}
