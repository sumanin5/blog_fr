"use client";

import * as React from "react";
import { Binary, Cpu, RotateCcw, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "../utils/copy-button";

export interface BitInspectorProps {
  /** 模式："utf8" 文本字符与字节显微镜；"float64" IEEE 754 双精度浮点显微镜 */
  mode?: "utf8" | "float64";
  /** 可选自定义标题 */
  title?: string;
  /** 可选自定义副标题 */
  subtitle?: string;
  /** utf8 模式默认输入文本，默认 "晚安" */
  defaultValue?: string;
  /** float64 模式默认操作数 A，默认 0.1 */
  defaultA?: number;
  /** float64 模式默认操作数 B，默认 0.2 */
  defaultB?: number;
  /** float64 模式快速实验预设组合 */
  presets?: Array<[number, number]>;
}

interface DecodedUtf8Byte {
  hex: string;
  bits: string;
  prefixLen: number;
}

export interface DecodedUtf8Char {
  glyph: string;
  displayGlyph: string;
  codePointHex: string;
  bytes: DecodedUtf8Byte[];
}

export interface Float64Parts {
  value: number;
  signBit: "0" | "1";
  exponentBits: string;
  mantissaBits: string;
  hex: string;
  biasedExponent: number;
  actualExponent: number | null;
  classification: "Zero" | "Subnormal" | "Normal" | "Infinity" | "NaN";
}

interface ParsedDecimal {
  sign: -1 | 1;
  digits: bigint;
  scale: number; // value = sign * digits * 10^(-scale)
}

const DEFAULT_FLOAT_PRESETS: Array<[number, number]> = [
  [0.1, 0.2],
  [0.5, 0.25],
  [0.1, 0.3],
  [1, 1e-16],
];

const MAX_UTF8_CHARS = 24;

function formatDisplayGlyph(char: string): string {
  if (char === " ") return "SPACE";
  if (char === "\n") return "\\n";
  if (char === "\t") return "\\t";
  return char;
}

export function inspectUtf8String(text: string): {
  chars: DecodedUtf8Char[];
  truncated: boolean;
  totalChars: number;
  totalBytes: number;
  hexStream: string;
} {
  const encoder = new TextEncoder();
  const codePoints = Array.from(text);
  const fullBytes = encoder.encode(text);
  const sliced = codePoints.slice(0, MAX_UTF8_CHARS);

  const chars: DecodedUtf8Char[] = sliced.map((char) => {
    const cp = char.codePointAt(0) ?? 0;
    const encoded = encoder.encode(char);
    const len = encoded.length;

    const bytes: DecodedUtf8Byte[] = Array.from(encoded).map((b, idx) => ({
      hex: b.toString(16).toUpperCase().padStart(2, "0"),
      bits: b.toString(2).padStart(8, "0"),
      prefixLen: len === 1 ? 1 : idx === 0 ? len + 1 : 2,
    }));

    return {
      glyph: char,
      displayGlyph: formatDisplayGlyph(char),
      codePointHex: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      bytes,
    };
  });

  const hexStream = Array.from(fullBytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");

  return {
    chars,
    truncated: codePoints.length > MAX_UTF8_CHARS,
    totalChars: codePoints.length,
    totalBytes: fullBytes.length,
    hexStream,
  };
}

export function decodeFloat64Bits(value: number): Float64Parts {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, value, false);

  let binary = "";
  let hex = "";
  for (let i = 0; i < 8; i += 1) {
    const byte = view.getUint8(i);
    binary += byte.toString(2).padStart(8, "0");
    hex += byte.toString(16).toUpperCase().padStart(2, "0");
  }

  const signBit = binary[0] as "0" | "1";
  const exponentBits = binary.slice(1, 12);
  const mantissaBits = binary.slice(12);
  const biasedExponent = Number.parseInt(exponentBits, 2);
  const mantissaIsZero = /^0+$/.test(mantissaBits);

  let classification: Float64Parts["classification"] = "Normal";
  let actualExponent: number | null = biasedExponent - 1023;

  if (biasedExponent === 2047) {
    classification = mantissaIsZero ? "Infinity" : "NaN";
    actualExponent = null;
  } else if (biasedExponent === 0) {
    classification = mantissaIsZero ? "Zero" : "Subnormal";
    actualExponent = -1022;
  }

  return {
    value,
    signBit,
    exponentBits,
    mantissaBits,
    hex: `0x${hex}`,
    biasedExponent,
    actualExponent,
    classification,
  };
}

function parseDecimalLiteral(raw: string): ParsedDecimal | null {
  const trimmed = raw.trim();
  const match = /^([+-])?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(
    trimmed,
  );
  if (!match) return null;

  const sign: -1 | 1 = match[1] === "-" ? -1 : 1;
  const intPart = match[2] ?? "";
  const fracPart = match[3] ?? match[4] ?? "";
  const expPart = match[5] ? Number.parseInt(match[5], 10) : 0;
  if (!Number.isFinite(expPart) || Math.abs(expPart) > 350) return null;

  const combined = `${intPart}${fracPart}`;
  if (!combined) return null;

  const digits = BigInt(combined);
  if (digits === BigInt(0)) {
    return { sign: 1, digits: BigInt(0), scale: 0 };
  }

  return {
    sign,
    digits,
    scale: fracPart.length - expPart,
  };
}

function formatParsedDecimal(dec: ParsedDecimal): string {
  if (dec.digits === BigInt(0)) return "0";
  const prefix = dec.sign < 0 ? "-" : "";
  const raw = dec.digits.toString();

  if (dec.scale <= 0) {
    return `${prefix}${raw}${"0".repeat(-dec.scale)}`;
  }

  if (raw.length <= dec.scale) {
    const padded = `${"0".repeat(dec.scale - raw.length)}${raw}`;
    return `${prefix}0.${padded}`.replace(/\.?0+$/, "");
  }

  const splitAt = raw.length - dec.scale;
  const intStr = raw.slice(0, splitAt);
  const fracStr = raw.slice(splitAt).replace(/0+$/, "");
  return fracStr ? `${prefix}${intStr}.${fracStr}` : `${prefix}${intStr}`;
}

function addParsedDecimals(a: ParsedDecimal, b: ParsedDecimal): ParsedDecimal {
  const targetScale = Math.max(a.scale, b.scale);
  const aScaled =
    BigInt(a.sign) * a.digits * BigInt(10) ** BigInt(targetScale - a.scale);
  const bScaled =
    BigInt(b.sign) * b.digits * BigInt(10) ** BigInt(targetScale - b.scale);
  const sum = aScaled + bScaled;

  if (sum === BigInt(0)) {
    return { sign: 1, digits: BigInt(0), scale: 0 };
  }

  return {
    sign: sum < BigInt(0) ? -1 : 1,
    digits: sum < BigInt(0) ? -sum : sum,
    scale: targetScale,
  };
}

/**
 * 判断十进制输入是否与当前存储的 IEEE 754 float64 值严格相等（即无尾数截断/舍入误差）。
 */
export function isDecimalExactInFloat64(
  decimal: ParsedDecimal | null,
  parts: Float64Parts,
): boolean {
  if (!decimal) return false;
  if (!Number.isFinite(parts.value)) return false;
  if (parts.value === 0) return decimal.digits === BigInt(0);
  if (decimal.digits === BigInt(0)) return false;

  const decSign: "0" | "1" = decimal.sign < 0 ? "1" : "0";
  if (decSign !== parts.signBit) return false;

  const exp =
    parts.biasedExponent === 0 ? -1022 - 52 : parts.biasedExponent - 1023 - 52;
  const implicitLead = parts.biasedExponent === 0 ? "0" : "1";
  const significand = BigInt(`0b${implicitLead}${parts.mantissaBits}`);

  // 对比 significand * 2^exp 与 decimal.digits * 10^(-decimal.scale)
  // 即比较 significand * 2^(exp + decimal.scale) * 5^(decimal.scale) 与 decimal.digits
  const s = decimal.scale;
  let lhs = significand;
  let rhs = decimal.digits;

  const pow2 = exp + s;
  if (pow2 >= 0) {
    lhs *= BigInt(2) ** BigInt(pow2);
  } else {
    rhs *= BigInt(2) ** BigInt(-pow2);
  }

  if (s >= 0) {
    lhs *= BigInt(5) ** BigInt(s);
  } else {
    rhs *= BigInt(5) ** BigInt(-s);
  }

  return lhs === rhs;
}

function Utf8InspectorView({
  defaultValue = "晚安",
}: {
  defaultValue?: string;
}) {
  const [text, setText] = React.useState(defaultValue);
  const inputId = React.useId();
  const decoded = React.useMemo(() => inspectUtf8String(text), [text]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label
            htmlFor={inputId}
            className="text-xs font-medium text-muted-foreground sm:text-sm"
          >
            输入任意文本（中文、ASCII、Emoji 均可）
          </Label>
          {text !== defaultValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setText(defaultValue)}
            >
              <RotateCcw aria-hidden="true" className="size-3" />
              恢复示例
            </Button>
          ) : null}
        </div>
        <Input
          id={inputId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="例如：晚安 / Rust 🦀 / A"
          className="font-mono text-sm sm:text-base"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/35 px-3.5 py-2.5 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span>
            字符数{" "}
            <strong className="font-mono text-foreground">
              {decoded.totalChars}
            </strong>
          </span>
          <span>
            UTF-8 总字节{" "}
            <strong className="font-mono text-foreground">
              {decoded.totalBytes} B
            </strong>
          </span>
          <span>
            总比特{" "}
            <strong className="font-mono text-foreground">
              {decoded.totalBytes * 8} bits
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-info/40 bg-info/15 font-mono text-xs text-foreground">
            前缀标识位
          </Badge>
          <Badge variant="outline" className="bg-muted font-mono text-xs text-foreground">
            码点载荷位
          </Badge>
        </div>
      </div>

      {decoded.chars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          在上方输入字符，查看 Unicode 码点如何被编码为 UTF-8 字节与 0/1 比特流。
        </div>
      ) : (
        <div className="space-y-3">
          {decoded.chars.map((charInfo, charIndex) => (
            <div
              key={`${charIndex}-${charInfo.codePointHex}`}
              className="rounded-lg border border-border/70 bg-background/60 p-3.5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex min-w-9 items-center justify-center rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-sm font-semibold text-foreground">
                    {charInfo.displayGlyph}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground sm:text-sm">
                    {charInfo.codePointHex}
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {charInfo.bytes.length} Byte{charInfo.bytes.length > 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {charInfo.bytes.map((byte, byteIndex) => (
                  <div
                    key={`${charIndex}-byte-${byteIndex}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/25 px-2.5 py-2"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground">
                      0x{byte.hex}
                    </span>
                    <div
                      className="flex items-center gap-0.5 font-mono text-xs"
                      aria-label={`字节 0x${byte.hex} 二进制 ${byte.bits}`}
                    >
                      {byte.bits.split("").map((bit, bitIdx) => {
                        const isPrefix = bitIdx < byte.prefixLen;
                        return (
                          <span
                            key={`${bitIdx}-${bit}`}
                            className={cn(
                              "inline-flex size-5 items-center justify-center rounded-xs border text-[11px] font-medium",
                              isPrefix
                                ? "border-info/45 bg-info/15 text-foreground"
                                : "border-border/70 bg-background text-foreground",
                            )}
                          >
                            {bit}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {decoded.truncated ? (
            <p className="text-xs text-muted-foreground">
              仅展示前 {MAX_UTF8_CHARS} 个字符的比特明细（总字节流统计包含完整输入）。
            </p>
          ) : null}

          {decoded.hexStream ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/35 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">
                  连续十六进制字节流
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-foreground sm:text-sm">
                  {decoded.hexStream}
                </div>
              </div>
              <CopyButton code={decoded.hexStream} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Float64InspectorView({
  defaultA = 0.1,
  defaultB = 0.2,
  presets = DEFAULT_FLOAT_PRESETS,
}: {
  defaultA?: number;
  defaultB?: number;
  presets?: Array<[number, number]>;
}) {
  const [rawA, setRawA] = React.useState(String(defaultA));
  const [rawB, setRawB] = React.useState(String(defaultB));
  const [focusTarget, setFocusTarget] = React.useState<"a" | "b" | "sum">("sum");
  const idA = React.useId();
  const idB = React.useId();

  const numA = Number(rawA);
  const numB = Number(rawB);
  const validInputs =
    rawA.trim() !== "" &&
    rawB.trim() !== "" &&
    Number.isFinite(numA) &&
    Number.isFinite(numB);

  const safeA = validInputs ? numA : 0;
  const safeB = validInputs ? numB : 0;
  const sum = safeA + safeB;

  const parsedA = React.useMemo(() => parseDecimalLiteral(rawA), [rawA]);
  const parsedB = React.useMemo(() => parseDecimalLiteral(rawB), [rawB]);
  const parsedSum = React.useMemo(
    () => (parsedA && parsedB ? addParsedDecimals(parsedA, parsedB) : null),
    [parsedA, parsedB],
  );

  const partsA = React.useMemo(() => decodeFloat64Bits(safeA), [safeA]);
  const partsB = React.useMemo(() => decodeFloat64Bits(safeB), [safeB]);
  const partsSum = React.useMemo(() => decodeFloat64Bits(sum), [sum]);

  const exactA = React.useMemo(
    () => isDecimalExactInFloat64(parsedA, partsA),
    [parsedA, partsA],
  );
  const exactB = React.useMemo(
    () => isDecimalExactInFloat64(parsedB, partsB),
    [parsedB, partsB],
  );
  const exactSum = React.useMemo(
    () => isDecimalExactInFloat64(parsedSum, partsSum),
    [parsedSum, partsSum],
  );

  const activeEntry =
    focusTarget === "a"
      ? { label: `操作数 A (${rawA || "0"})`, parts: partsA, isExact: exactA }
      : focusTarget === "b"
        ? { label: `操作数 B (${rawB || "0"})`, parts: partsB, isExact: exactB }
        : {
            label: `相加结果 (${String(sum)})`,
            parts: partsSum,
            isExact: exactSum,
          };

  const decimalExpectation = parsedSum ? formatParsedDecimal(parsedSum) : "—";

  return (
    <div className="space-y-5">
      {presets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            实验预设：
          </span>
          {presets.map(([pa, pb], idx) => {
            const isSelected = rawA === String(pa) && rawB === String(pb);
            return (
              <Button
                key={`${pa}-${pb}-${idx}`}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="h-7 px-2.5 font-mono text-xs"
                onClick={() => {
                  setRawA(String(pa));
                  setRawB(String(pb));
                }}
              >
                {pa} + {pb}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={idA} className="text-xs text-muted-foreground">
            操作数 A（十进制输入）
          </Label>
          <Input
            id={idA}
            type="text"
            inputMode="decimal"
            value={rawA}
            onChange={(event) => setRawA(event.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idB} className="text-xs text-muted-foreground">
            操作数 B（十进制输入）
          </Label>
          <Input
            id={idB}
            type="text"
            inputMode="decimal"
            value={rawB}
            onChange={(event) => setRawB(event.target.value)}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-3.5 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">数学十进制精确期望</div>
          <div className="font-mono text-sm font-semibold text-foreground sm:text-base">
            {decimalExpectation}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              IEEE 754 实算结果
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                exactSum
                  ? "border-success/40 bg-success/15 text-foreground"
                  : "border-warning/50 bg-warning/20 text-foreground",
              )}
            >
              {exactSum ? "精确无截断" : "存在舍入/截断误差"}
            </Badge>
          </div>
          <div className="break-all font-mono text-sm font-semibold text-foreground sm:text-base">
            {validInputs ? String(sum) : "请输入有效数字"}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={focusTarget}
            onValueChange={(value) =>
              setFocusTarget(value as "a" | "b" | "sum")
            }
          >
            <TabsList className="h-auto p-1">
              <TabsTrigger value="a" className="px-3 py-1 text-xs">
                查看 A
              </TabsTrigger>
              <TabsTrigger value="b" className="px-3 py-1 text-xs">
                查看 B
              </TabsTrigger>
              <TabsTrigger value="sum" className="px-3 py-1 text-xs">
                查看 A + B
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-foreground">
              {activeEntry.parts.hex}
            </span>
            <span>·</span>
            <span>
              指数{" "}
              <strong className="font-mono text-foreground">
                {activeEntry.parts.actualExponent !== null
                  ? `2^(${activeEntry.parts.actualExponent})`
                  : activeEntry.parts.classification}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="border-info/45 bg-info/15 text-foreground">
            1 位符号位
          </Badge>
          <Badge variant="outline" className="border-warning/50 bg-warning/20 text-foreground">
            11 位指数位
          </Badge>
          <Badge variant="outline" className="border-success/45 bg-success/15 text-foreground">
            52 位尾数位
          </Badge>
          {!activeEntry.isExact ? (
            <Badge variant="outline" className="border-destructive/45 bg-destructive/15 text-foreground">
              末端舍入 / 截断区
            </Badge>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/70 bg-background/70 p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">
              {activeEntry.label} 的 64 位二进制布局
            </span>
            <span className="font-mono text-muted-foreground">
              {activeEntry.parts.signBit === "1" ? "负数 (-)" : "非负数 (+)"} ·{" "}
              {activeEntry.parts.classification}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
            <span
              title="Sign bit (1 bit)"
              className="inline-flex size-6 items-center justify-center rounded-xs border border-info/50 bg-info/20 font-semibold text-foreground"
            >
              {activeEntry.parts.signBit}
            </span>

            <span className="mx-0.5 text-muted-foreground">|</span>

            {activeEntry.parts.exponentBits.split("").map((bit, idx) => (
              <span
                key={`exp-${idx}`}
                title={`Exponent bit ${idx + 1}/11`}
                className="inline-flex size-5 items-center justify-center rounded-xs border border-warning/50 bg-warning/20 text-foreground"
              >
                {bit}
              </span>
            ))}

            <span className="mx-0.5 text-muted-foreground">|</span>

            {activeEntry.parts.mantissaBits.split("").map((bit, idx) => {
              const isRoundingZone = !activeEntry.isExact && idx >= 49;
              return (
                <span
                  key={`man-${idx}`}
                  title={
                    isRoundingZone
                      ? `尾数第 ${idx + 1}/52 位（第 53 位后被舍入截断）`
                      : `Mantissa bit ${idx + 1}/52`
                  }
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-xs border text-foreground",
                    isRoundingZone
                      ? "border-destructive/50 bg-destructive/15 font-semibold"
                      : "border-success/40 bg-success/15",
                  )}
                >
                  {bit}
                </span>
              );
            })}

            {!activeEntry.isExact ? (
              <span className="ml-1 inline-flex items-center rounded-xs border border-dashed border-destructive/50 bg-destructive/10 px-1.5 py-0.5 text-[11px] text-foreground">
                ✂ 第53位起截断舍入
              </span>
            ) : null}
          </div>
        </div>

        <Alert className="border-border/70 bg-muted/25">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold text-foreground sm:text-sm">
            {activeEntry.isExact
              ? "二进制精确表示成立"
              : "为什么会出现“漏水”误差？"}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {activeEntry.isExact
              ? "当前数字的分母仅包含 2 的幂次，因此 52 位尾数可以一字不差地装下全部有效位；换成 0.5 + 0.25 等 2 的负幂组合时同样不会丢失精度。"
              : "以十进制有限的 0.1、0.2 在二进制里是无限循环小数 (0.0001100110011...)₂；写入 52 位尾数桶时必须在第 53 位进行向偶数舍入截断，截断误差会一路带入加法结果。"}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

/**
 * 比特显微镜：将高层的文本字符或浮点数即时还原为底层 UTF-8 字节流或 IEEE 754 64 位二进制布局。
 */
export function BitInspector({
  mode = "utf8",
  title,
  subtitle,
  defaultValue = "晚安",
  defaultA = 0.1,
  defaultB = 0.2,
  presets = DEFAULT_FLOAT_PRESETS,
}: BitInspectorProps) {
  const isFloat = mode === "float64";
  const resolvedTitle =
    title ??
    (isFloat ? "IEEE 754 浮点数比特显微镜" : "UTF-8 字符与比特显微镜");
  const resolvedSubtitle =
    subtitle ??
    (isFloat
      ? "把十进制加法拆解成 1 位符号 + 11 位指数 + 52 位尾数，观察舍入截断发生在哪一格。"
      : "把人类可读的文字符号卸妆为 Unicode 码点、UTF-8 前缀位与真实二进制字节流。");

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {isFloat ? (
            <Cpu aria-hidden="true" className="size-4 text-primary" />
          ) : (
            <Binary aria-hidden="true" className="size-4 text-primary" />
          )}
          <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
            {resolvedTitle}
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            {isFloat ? "float64" : "utf8"}
          </Badge>
        </div>
        <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {resolvedSubtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:px-6">
        {isFloat ? (
          <Float64InspectorView
            defaultA={defaultA}
            defaultB={defaultB}
            presets={presets}
          />
        ) : (
          <Utf8InspectorView defaultValue={defaultValue} />
        )}
      </CardContent>
    </Card>
  );
}
