.PHONY: test test-cov test-cov-html test-fast lint format clean help

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo "可用命令："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

test: ## 运行所有测试
	uv run pytest -v

test-fast: ## 快速测试（跳过慢速测试）
	uv run pytest -v -m "not slow"

test-cov: ## 运行测试并生成覆盖率报告（终端）
	uv run pytest --cov=app --cov-report=term-missing -v

test-cov-html: ## 运行测试并生成 HTML 覆盖率报告
	uv run pytest --cov=app --cov-report=html --cov-report=term-missing -v
	@echo "\n✅ 覆盖率报告: htmlcov/index.html"

test-report: ## 运行测试并生成完整报告（覆盖率 + 测试结果）
	uv run pytest --cov=app --cov-report=html --html=test-report.html --self-contained-html -v
	@echo "\n✅ 测试报告: test-report.html"
	@echo "✅ 覆盖率报告: htmlcov/index.html"

test-unit: ## 只运行单元测试
	uv run pytest -v -m unit

test-integration: ## 只运行集成测试
	uv run pytest -v -m integration

test-users: ## 只运行用户模块测试
	uv run pytest -v -m users

test-posts: ## 只运行文章模块测试
	uv run pytest -v -m posts

test-media: ## 只运行媒体模块测试
	uv run pytest -v -m media

lint: ## 代码检查
	uv run ruff check .

format: ## 代码格式化
	uv run ruff format .

clean: ## 清理临时文件
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

install: ## 安装依赖
	uv sync --all-extras

install-dev: ## 安装开发依赖
	uv sync --all-extras --group dev

db-migrate: ## 运行数据库迁移
	alembic upgrade head

db-rollback: ## 回滚数据库迁移
	alembic downgrade -1

db-reset: ## 重置数据库（危险！）
	alembic downgrade base
	alembic upgrade head

run: ## 启动开发服务器
	fastapi dev app/main.py

run-prod: ## 启动生产服务器
	fastapi run app/main.py
