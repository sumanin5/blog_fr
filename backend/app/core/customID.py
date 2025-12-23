from fastapi.routing import APIRoute


# ============================================================
# 自定义 operation_id 生成函数
# ============================================================
def custom_generate_unique_id(route: APIRoute) -> str:
    """
    为每个路由自动生成简洁的 operation_id

    生成规则：
    - 如果路由已手动设置 operation_id，则使用手动设置的值
    - 否则使用函数名（自动转换为 camelCase）

    示例：
    - 函数名 login -> operation_id: login
    - 函数名 get_current_user_info -> operation_id: getCurrentUserInfo
    """

    # 将 snake_case 转换为 camelCase
    def to_camel_case(snake_str: str) -> str:
        components = snake_str.split("_")
        # 第一个单词保持小写，其余单词首字母大写
        return components[0] + "".join(x.title() for x in components[1:])

    return to_camel_case(route.name)
