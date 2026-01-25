import * as humps from "humps";

/**
 * �️ 保护名单：这些原生类型严禁参与递归转换，必须原样保留。
 */
type ProtectedType = File | Blob | Date | FormData;

function isProtected(val: unknown): val is ProtectedType {
  return (
    val instanceof File ||
    val instanceof Blob ||
    val instanceof Date ||
    val instanceof FormData
  );
}

/**
 * TypeScript 类型工具：将 snake_case 字符串转换为 camelCase
 */
export type CamelCase<S extends string> =
  S extends `${infer P1}_${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

/**
 * TypeScript 类型工具：递归地将对象及其属性从 snake_case 转换为 camelCase
 */
export type Camelize<T> = T extends ProtectedType
  ? T
  : T extends (infer U)[]
  ? Camelize<U>[]
  : T extends object
  ? {
      [K in keyof T as K extends string ? CamelCase<K> : K]: Camelize<T[K]>;
    }
  : T;

/**
 * 核心运行时逻辑：深度递归转换键名，同时保护白名单对象。
 */
function transformKeysDeep(
  data: unknown,
  processor: (s: string) => string
): any {
  if (!data || typeof data !== "object" || isProtected(data)) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => transformKeysDeep(item, processor));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const newKey = processor(key);
    result[newKey] = transformKeysDeep(value, processor);
  }
  return result;
}

/**
 * 将后端返回的 snake_case 数据规范化为驼峰 (ApiData)
 */
export function normalizeApiResponse<T>(data: T): ApiData<T> {
  return transformKeysDeep(data, humps.camelize) as ApiData<T>;
}

/**
 * 将前端的 camelCase 数据去规范化为下划线，以符合后端契约
 * 支持传入目标类型 T 以实现类型安全的转换结果
 */
export function denormalizeApiRequest<T = any>(data: unknown): T {
  return transformKeysDeep(data, humps.decamelize) as T;
}

/**
 * 官方对外接口模型
 */
export type ApiData<T> = Camelize<T>;
