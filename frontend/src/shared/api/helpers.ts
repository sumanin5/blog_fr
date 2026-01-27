import { denormalizeApiRequest } from "./transformers";

/**
 * 🔧 Mutation Helper：自动转换 camelCase -> snake_case
 *
 * 用于包装所有的 mutation 函数，自动处理请求体的命名风格转换。
 *
 * @example
 * ```ts
 * const updateMutation = useMutation({
 *   mutationFn: withSnakeCase(({ id, data }) =>
 *     updatePostByType({
 *       path: { post_type: type, post_id: id },
 *       body: data, // 会自动转换为 snake_case
 *     })
 *   ),
 * });
 * ```
 */
export function withSnakeCase<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  return (...args: TArgs) => {
    // 转换所有参数（如果是对象）
    const transformedArgs = args.map((arg) => {
      if (arg && typeof arg === "object" && !Array.isArray(arg)) {
        return denormalizeApiRequest(arg);
      }
      return arg;
    }) as TArgs;

    return fn(...transformedArgs);
  };
}

/**
 * 🔧 单个对象转换：camelCase -> snake_case
 *
 * 用于手动转换单个对象，适用于需要精确控制转换时机的场景。
 */
export function toSnakeCase<T>(data: T): any {
  return denormalizeApiRequest(data);
}
