"""调试 AST 结构"""

import json

from app.posts.utils import PostProcessor

# 测试强调节点
content1 = "这是 **粗体**、_斜体_ 和 ~~删除线~~"
processor1 = PostProcessor(content1).process()
print("=== 强调节点 ===")
print(json.dumps(processor1.content_ast, indent=2, ensure_ascii=False))

# 测试链接节点
content2 = "[链接文本](https://example.com)"
processor2 = PostProcessor(content2).process()
print("\n=== 链接节点 ===")
print(json.dumps(processor2.content_ast, indent=2, ensure_ascii=False))

# 测试数学公式
content3 = "这是行内公式：$E = mc^2$"
processor3 = PostProcessor(content3).process()
print("\n=== 数学公式 ===")
print(json.dumps(processor3.content_ast, indent=2, ensure_ascii=False))
print("\nHTML:")
print(processor3.content_html)
