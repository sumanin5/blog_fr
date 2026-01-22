import humps from "humps";

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
export type Camelize<T> = T extends (infer U)[]
  ? Camelize<U>[]
  : T extends object
  ? {
      [K in keyof T as K extends string ? CamelCase<K> : K]: Camelize<T[K]>;
    }
  : T;

/**
 * 将后端返回的 snake_case 数据转换为 camelCase
 * 用途：
 * - 服务端 fetch 后调用
 * - 客户端在响应拦截器中调用
 */
export function normalizeApiResponse<T>(data: T): Camelize<T> {
  if (!data) return data as any;
  return humps.camelizeKeys(data as any) as any;
}

/**
 * 将前端的 camelCase 数据转换为 snake_case
 * 用途：
 * - 在请求拦截器中调用
 * - 手动准备发送给后端的数据时调用
 *
 * @example
 * const camelData = { contentMdx: "...", coverMedia: {...} }
 * const snakeData = denormalizeApiRequest(camelData)
 * // 结果：{ content_mdx: "...", cover_media: {...} }
 */
export function denormalizeApiRequest<T>(data: T): T {
  if (!data) return data;
  return humps.decamelizeKeys(data) as T;
}

// transformers.ts
export type ApiData<T> = Camelize<T>;
