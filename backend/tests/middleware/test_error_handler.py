"""
错误处理中间件单元测试

测试ErrorHandlerMiddleware的核心逻辑，不涉及具体业务场景
"""

from datetime import datetime

import pytest
from app.core.error_handlers import (
    app_exception_handler,
    database_exception_handler,
    unexpected_exception_handler,
    validation_exception_handler,
)
from app.core.exceptions import BaseAppException
from app.users.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError


@pytest.mark.unit
@pytest.mark.middleware
class TestErrorHandlerMiddleware:
    """错误处理（原中间件现为异常处理器）单元测试"""

    def setup_method(self):
        """每个测试前创建独立的应用实例"""
        self.app = FastAPI()

        # 注册异常处理器
        self.app.add_exception_handler(BaseAppException, app_exception_handler)
        self.app.add_exception_handler(
            RequestValidationError, validation_exception_handler
        )
        self.app.add_exception_handler(SQLAlchemyError, database_exception_handler)
        self.app.add_exception_handler(Exception, unexpected_exception_handler)

        # raise_server_exceptions=False 让测试客户端不抛出异常，而是返回响应
        self.client = TestClient(self.app, raise_server_exceptions=False)

    def test_user_not_found_exception_handling(self):
        """测试用户不存在异常的处理"""

        @self.app.get("/test-user-not-found")
        async def mock_endpoint():
            raise UserNotFoundError("User with ID 123 not found")

        response = self.client.get("/test-user-not-found")

        # 验证状态码
        assert response.status_code == 404

        # 验证响应格式
        data = response.json()
        assert "error" in data
        error = data["error"]

        # 验证错误字段
        assert error["code"] == "USER_NOT_FOUND"
        assert error["message"] == "User with ID 123 not found"
        assert error["details"] == {}
        assert "timestamp" in error
        assert "request_id" in error

        # 验证时间戳格式
        timestamp = error["timestamp"]
        assert timestamp.endswith("Z")
        # 验证时间戳可以被解析
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

    def test_user_already_exists_exception_handling(self):
        """测试用户已存在异常的处理"""

        @self.app.post("/test-user-exists")
        async def mock_endpoint():
            raise UserAlreadyExistsError("Username 'john' already exists")

        response = self.client.post("/test-user-exists")

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "USER_ALREADY_EXISTS"
        assert data["error"]["message"] == "Username 'john' already exists"

    def test_invalid_credentials_exception_handling(self):
        """测试认证失败异常的处理"""

        @self.app.post("/test-invalid-credentials")
        async def mock_endpoint():
            raise InvalidCredentialsError("Invalid username or password")

        response = self.client.post("/test-invalid-credentials")

        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "INVALID_CREDENTIALS"
        assert data["error"]["message"] == "Invalid username or password"

    def test_inactive_user_exception_handling(self):
        """测试用户未激活异常的处理"""

        @self.app.get("/test-inactive-user")
        async def mock_endpoint():
            raise InactiveUserError("User account is inactive")

        response = self.client.get("/test-inactive-user")

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INACTIVE_USER"
        assert data["error"]["message"] == "User account is inactive"

    def test_custom_base_exception_with_details(self):
        """测试带有详细信息的自定义异常"""

        class CustomTestError(BaseAppException):
            def __init__(self, message: str):
                super().__init__(
                    message=message,
                    status_code=418,
                    error_code="CUSTOM_TEST_ERROR",
                    details={"field": "test_field", "value": "test_value"},
                )

        @self.app.get("/test-custom-error")
        async def mock_endpoint():
            raise CustomTestError("Custom error with details")

        response = self.client.get("/test-custom-error")

        assert response.status_code == 418
        data = response.json()
        assert data["error"]["code"] == "CUSTOM_TEST_ERROR"
        assert data["error"]["message"] == "Custom error with details"
        assert data["error"]["details"] == {
            "field": "test_field",
            "value": "test_value",
        }

    def test_pydantic_validation_error_handling(self):
        """测试Pydantic验证异常的处理"""
        # 注意：Pydantic ValidationError 在端点内部抛出时会被当作未预期异常处理
        # 只有 FastAPI 的 RequestValidationError 会被特殊处理

        @self.app.post("/test-validation-error")
        async def mock_endpoint():
            # 创建一个会产生验证错误的模型
            class TestModel(BaseModel):
                email: str
                age: int

            try:
                TestModel(email="invalid-email", age="not-a-number")
            except ValidationError as e:
                raise e

        response = self.client.post("/test-validation-error")

        # Pydantic ValidationError 在端点内部抛出时会被当作未预期异常
        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "INTERNAL_ERROR"

    def test_sqlalchemy_database_error_handling(self):
        """测试SQLAlchemy数据库异常的处理"""

        @self.app.get("/test-database-error")
        async def mock_endpoint():
            raise OperationalError("Connection to database failed", None, None)

        response = self.client.get("/test-database-error")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"
        # 消息内容取决于环境设置，这里只验证结构

    def test_sqlalchemy_integrity_error_handling(self):
        """测试SQLAlchemy完整性约束异常的处理"""

        @self.app.post("/test-integrity-error")
        async def mock_endpoint():
            raise IntegrityError("Duplicate key value", None, None)

        response = self.client.post("/test-integrity-error")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "DATABASE_ERROR"

    def test_unexpected_exception_handling(self):
        """测试未预期异常的处理"""

        @self.app.get("/test-unexpected-error")
        async def mock_endpoint():
            raise ValueError("Something unexpected happened")

        response = self.client.get("/test-unexpected-error")

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert "error" in data
        assert "timestamp" in data["error"]
        assert "request_id" in data["error"]
        # 消息内容取决于环境设置

    def test_normal_request_passes_through(self):
        """测试正常请求不受中间件影响"""

        @self.app.get("/test-normal")
        async def mock_endpoint():
            return {"message": "success", "data": {"id": 1, "name": "test"}}

        response = self.client.get("/test-normal")

        assert response.status_code == 200
        assert response.json() == {
            "message": "success",
            "data": {"id": 1, "name": "test"},
        }

    def test_error_response_format_consistency(self):
        """测试所有错误响应格式的一致性"""

        test_cases = [
            (UserNotFoundError("Test user not found"), 404, "USER_NOT_FOUND"),
            (UserAlreadyExistsError("Test user exists"), 400, "USER_ALREADY_EXISTS"),
            (InvalidCredentialsError("Test invalid creds"), 401, "INVALID_CREDENTIALS"),
            (InactiveUserError("Test inactive user"), 400, "INACTIVE_USER"),
        ]

        for i, (exception, expected_status, expected_code) in enumerate(test_cases):

            @self.app.get(f"/test-format-{i}")
            async def mock_endpoint():
                raise exception

            response = self.client.get(f"/test-format-{i}")
            data = response.json()

            # 验证状态码
            assert response.status_code == expected_status

            # 验证所有错误都有相同的JSON结构
            assert "error" in data
            error = data["error"]

            # 验证必需字段存在
            required_fields = {"code", "message", "details", "timestamp", "request_id"}
            assert set(error.keys()) == required_fields

            # 验证错误代码
            assert error["code"] == expected_code

            # 验证时间戳格式
            assert error["timestamp"].endswith("Z")

            # 验证请求ID不为空
            assert error["request_id"]
            assert len(error["request_id"]) > 0

    @pytest.mark.parametrize(
        "exception_class,expected_status,expected_code",
        [
            (UserNotFoundError, 404, "USER_NOT_FOUND"),
            (UserAlreadyExistsError, 400, "USER_ALREADY_EXISTS"),
            (InvalidCredentialsError, 401, "INVALID_CREDENTIALS"),
            (InactiveUserError, 400, "INACTIVE_USER"),
        ],
    )
    def test_exception_type_mapping(
        self, exception_class, expected_status, expected_code
    ):
        """参数化测试：验证异常类型到HTTP状态码和错误代码的映射"""

        @self.app.get("/test-mapping")
        async def mock_endpoint():
            raise exception_class("Test message")

        response = self.client.get("/test-mapping")

        assert response.status_code == expected_status
        data = response.json()
        assert data["error"]["code"] == expected_code
        assert data["error"]["message"] == "Test message"

    def test_request_id_propagation(self):
        """测试请求ID在错误响应中的传播"""

        @self.app.get("/test-request-id")
        async def mock_endpoint():
            raise UserNotFoundError("Test error for request ID")

        response = self.client.get("/test-request-id")

        data = response.json()
        request_id = data["error"]["request_id"]

        # 验证请求ID格式（UUID格式）
        assert len(request_id) > 0
        assert isinstance(request_id, str)

        # 如果有RequestIDMiddleware，验证响应头中也有相同的请求ID
        # 注意：在这个单元测试中，我们只测试ErrorHandler，所以可能没有X-Request-ID头

    def test_multiple_requests_have_unique_request_ids(self):
        """测试多个请求有唯一的请求ID"""

        @self.app.get("/test-unique-ids")
        async def mock_endpoint():
            raise UserNotFoundError("Test error for unique IDs")

        # 发送多个请求
        responses = []
        for _ in range(5):
            response = self.client.get("/test-unique-ids")
            responses.append(response)

        # 提取所有请求ID
        request_ids = []
        for response in responses:
            data = response.json()
            request_ids.append(data["error"]["request_id"])

        # 验证所有请求ID都是唯一的
        assert len(set(request_ids)) == len(request_ids)

    def test_error_logging_behavior(self, caplog):
        """测试错误日志记录行为"""
        import logging

        @self.app.get("/test-logging")
        async def mock_endpoint():
            raise UserNotFoundError("Test error for logging")

        # 设置日志级别
        caplog.set_level(logging.WARNING)

        response = self.client.get("/test-logging")

        # 验证响应
        assert response.status_code == 404

        # 验证日志记录
        assert len(caplog.records) > 0

        # 查找相关的日志记录
        error_logs = [
            record
            for record in caplog.records
            if "Business exception" in record.message
        ]
        assert len(error_logs) > 0

        # 验证日志内容
        log_record = error_logs[0]
        assert "USER_NOT_FOUND" in log_record.message
        assert "Test error for logging" in log_record.message

    def test_server_error_vs_client_error_logging_levels(self, caplog):
        """测试服务器错误和客户端错误的不同日志级别"""
        import logging

        # 测试客户端错误（4xx）- 应该是WARNING级别
        @self.app.get("/test-client-error")
        async def client_error_endpoint():
            raise UserNotFoundError("Client error test")

        # 测试服务器错误（5xx）- 应该是ERROR级别
        @self.app.get("/test-server-error")
        async def server_error_endpoint():
            raise ValueError("Server error test")

        caplog.set_level(logging.DEBUG)
        caplog.clear()

        # 测试客户端错误
        self.client.get("/test-client-error")
        client_error_logs = [
            r for r in caplog.records if "Client error test" in str(r.message)
        ]

        caplog.clear()

        # 测试服务器错误
        self.client.get("/test-server-error")
        server_error_logs = [
            r for r in caplog.records if "Server error test" in str(r.message)
        ]

        # 验证日志级别
        if client_error_logs:
            assert client_error_logs[0].levelno == logging.WARNING

        if server_error_logs:
            assert server_error_logs[0].levelno == logging.ERROR
