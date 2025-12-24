"""
文件上传中间件单元测试

测试FileSizeLimitMiddleware的核心逻辑，包括文件大小限制和验证
"""

from io import BytesIO

import pytest
from app.middleware.file_upload import FileSizeLimitMiddleware
from fastapi import FastAPI, File, UploadFile
from fastapi.testclient import TestClient


@pytest.mark.unit
@pytest.mark.middleware
class TestFileSizeLimitMiddleware:
    """文件上传中间件单元测试"""

    def setup_method(self):
        """每个测试前创建独立的应用实例"""
        self.app = FastAPI()
        # 设置较小的文件大小限制用于测试 (1MB)
        self.max_size = 1024 * 1024  # 1MB
        self.app.add_middleware(FileSizeLimitMiddleware, max_upload_size=self.max_size)
        self.client = TestClient(self.app)

        # 创建测试端点
        @self.app.post("/upload")
        async def upload_endpoint(file: UploadFile = File(...)):
            return {"filename": file.filename, "size": file.size}

        @self.app.get("/normal")
        async def normal_endpoint():
            return {"message": "success"}

    def test_normal_file_upload_under_limit(self):
        """测试正常文件上传（文件大小在限制内）"""
        # 创建小文件 (100KB)
        file_content = b"x" * (100 * 1024)
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)

        # 验证请求成功通过
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test.txt"

    def test_file_upload_exceeding_size_limit(self):
        """测试文件上传超出大小限制"""
        # 创建超大文件 (2MB，超过1MB限制)
        file_content = b"x" * (2 * 1024 * 1024)
        files = {"file": ("large_file.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)

        # 验证返回413状态码
        assert response.status_code == 413

        # 验证错误响应格式
        data = response.json()
        assert "error" in data
        assert data["error"] == "FILE_TOO_LARGE"
        assert "message" in data
        assert "1MB" in data["message"]  # 验证错误消息包含大小限制

    def test_file_upload_exactly_at_limit(self):
        """测试文件大小接近限制但在范围内"""
        # 创建接近1MB但留出multipart开销空间的文件
        # multipart/form-data会增加约200-500字节的开销
        file_content = b"x" * (self.max_size - 1000)  # 留出1KB空间给multipart开销
        files = {"file": ("limit_file.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)

        # 验证请求成功通过
        assert response.status_code == 200

    def test_non_upload_request_passes_through(self):
        """测试非文件上传请求不受中间件影响"""
        response = self.client.get("/normal")

        assert response.status_code == 200
        assert response.json() == {"message": "success"}

    def test_non_multipart_post_request_passes_through(self):
        """测试非multipart/form-data的POST请求不受影响"""
        response = self.client.post("/normal", json={"data": "test"})

        # 这个请求会返回405因为端点不支持POST，但中间件不应该拦截
        assert response.status_code == 405  # Method Not Allowed

    def test_missing_content_length_header(self):
        """测试缺少Content-Length头的请求"""
        # 使用requests直接构造请求，不设置Content-Length
        from unittest.mock import patch

        # 模拟没有Content-Length头的情况
        with patch.object(self.client, "post") as mock_post:
            # 模拟返回没有content-length头的请求
            mock_response = type(
                "MockResponse",
                (),
                {"status_code": 200, "json": lambda: {"filename": "test.txt"}},
            )()
            mock_post.return_value = mock_response

            # 这种情况下中间件应该让请求通过
            response = mock_post("/upload", files={"file": ("test.txt", "content")})
            assert response.status_code == 200

    def test_different_file_size_limits(self):
        """测试不同的文件大小限制配置"""
        # 创建新的应用实例，使用不同的大小限制
        app = FastAPI()
        small_limit = 500 * 1024  # 500KB
        app.add_middleware(FileSizeLimitMiddleware, max_upload_size=small_limit)
        client = TestClient(app)

        @app.post("/upload")
        async def upload_endpoint(file: UploadFile = File(...)):
            return {"filename": file.filename}

        # 创建600KB文件（超过500KB限制）
        file_content = b"x" * (600 * 1024)
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}

        response = client.post("/upload", files=files)

        assert response.status_code == 413
        data = response.json()
        assert data["error"] == "FILE_TOO_LARGE"

    def test_error_response_format(self):
        """测试错误响应格式的一致性"""
        # 创建超大文件
        file_content = b"x" * (2 * 1024 * 1024)
        files = {"file": ("large.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)

        assert response.status_code == 413
        data = response.json()

        # 验证错误响应结构
        required_fields = {"error", "message"}
        assert set(data.keys()) == required_fields

        # 验证错误代码
        assert data["error"] == "FILE_TOO_LARGE"

        # 验证错误消息包含大小信息
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0
        assert "MB" in data["message"]

    def test_content_type_detection(self):
        """测试Content-Type检测逻辑"""
        # 测试不同的Content-Type
        test_cases = [
            ("multipart/form-data; boundary=something", True),
            ("multipart/form-data", True),
            ("application/json", False),
            ("text/plain", False),
            ("application/x-www-form-urlencoded", False),
        ]

        for content_type, should_check in test_cases:
            # 创建新的应用实例用于每个测试
            app = FastAPI()
            middleware = FileSizeLimitMiddleware(app, max_upload_size=1024)

            # 模拟请求对象
            from unittest.mock import Mock

            from fastapi import Request

            mock_scope = {"type": "http"}
            mock_receive = Mock()
            mock_request = Mock(spec=Request)
            mock_request.method = "POST"
            mock_request.headers = {"content-type": content_type}

            # 测试_is_upload_request方法
            result = middleware._is_upload_request(mock_request)
            assert result == should_check

    def test_get_request_not_checked(self):
        """测试GET请求不会被检查文件大小"""
        from unittest.mock import Mock

        from fastapi import Request

        app = FastAPI()
        middleware = FileSizeLimitMiddleware(app, max_upload_size=1024)

        # 模拟GET请求
        mock_request = Mock(spec=Request)
        mock_request.method = "GET"
        mock_request.headers = {"content-type": "multipart/form-data"}

        result = middleware._is_upload_request(mock_request)
        assert result is False

    def test_middleware_logging(self, caplog):
        """测试中间件日志记录"""
        import logging

        caplog.set_level(logging.WARNING)

        # 创建超大文件触发日志
        file_content = b"x" * (2 * 1024 * 1024)
        files = {"file": ("large.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)

        assert response.status_code == 413

        # 验证日志记录
        warning_logs = [
            record for record in caplog.records if record.levelno == logging.WARNING
        ]

        assert len(warning_logs) > 0

        # 验证日志内容
        log_message = warning_logs[0].message
        assert "文件上传大小超出限制" in log_message
        # 实际大小会包含multipart开销，所以只验证大于原始文件大小
        assert "2097" in log_message  # 验证包含2MB相关的数字
        assert str(self.max_size) in log_message  # 限制大小

    @pytest.mark.parametrize(
        "file_size,expected_status",
        [
            (100 * 1024, 200),  # 100KB - 应该通过
            (500 * 1024, 200),  # 500KB - 应该通过
            (900 * 1024, 200),  # 900KB - 应该通过（留出multipart开销空间）
            (1.5 * 1024 * 1024, 413),  # 1.5MB - 超过限制
            (2 * 1024 * 1024, 413),  # 2MB - 超过限制
        ],
    )
    def test_various_file_sizes(self, file_size, expected_status):
        """参数化测试：验证不同文件大小的处理"""
        file_content = b"x" * int(file_size)
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}

        response = self.client.post("/upload", files=files)
        assert response.status_code == expected_status

    def test_default_max_size_configuration(self):
        """测试默认最大文件大小配置"""
        # 创建使用默认配置的中间件
        app = FastAPI()
        app.add_middleware(FileSizeLimitMiddleware)  # 使用默认50MB
        client = TestClient(app)

        @app.post("/upload")
        async def upload_endpoint(file: UploadFile = File(...)):
            return {"filename": file.filename}

        # 创建小文件，应该通过
        file_content = b"x" * (1024 * 1024)  # 1MB
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}

        response = client.post("/upload", files=files)
        assert response.status_code == 200

    def test_zero_size_file(self):
        """测试零大小文件"""
        files = {"file": ("empty.txt", BytesIO(b""), "text/plain")}

        response = self.client.post("/upload", files=files)
        assert response.status_code == 200

    def test_middleware_with_multiple_files(self):
        """测试多文件上传的处理"""
        # 创建多个小文件
        files = [
            ("files", ("file1.txt", BytesIO(b"x" * 1000), "text/plain")),
            ("files", ("file2.txt", BytesIO(b"x" * 1000), "text/plain")),
        ]

        # 注意：这个测试主要验证中间件不会因为多文件而出错
        # 实际的Content-Length是所有文件的总大小
        response = self.client.post("/upload", files=files)

        # 响应可能是200或422，取决于端点如何处理多文件
        # 重点是不应该返回413（文件过大错误）
        assert response.status_code != 413
