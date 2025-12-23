"""
用户API测试模块

这个包包含了所有与用户相关的API测试，按功能分类组织：

📁 test_auth.py - 用户认证测试
  - 用户注册功能测试
  - 用户登录功能测试
  - Token验证测试

📁 test_profile.py - 用户资料管理测试
  - 获取用户信息测试
  - 更新用户资料测试
  - 删除用户账号测试

📁 test_permissions.py - 用户权限管理测试
  - 角色权限验证测试
  - 用户列表访问权限测试
  - 跨用户操作权限测试

使用方法：
  # 运行所有用户测试
  pytest tests/api/users/ -v

  # 运行特定模块
  pytest tests/api/users/test_auth.py -v
  pytest tests/api/users/test_profile.py -v
  pytest tests/api/users/test_permissions.py -v

  # 按标记运行
  pytest -m "users" -v
  pytest -m "users and permissions" -v
  pytest -m "integration" -v

测试标记说明：
  - @pytest.mark.integration: 集成测试标记
  - @pytest.mark.users: 用户模块测试标记
  - @pytest.mark.permissions: 权限相关测试标记
"""
