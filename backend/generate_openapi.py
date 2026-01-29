import json
import os
import sys

# 添加项目根目录到 sys.path
sys.path.append(os.getcwd())

from app.main import app


def generate_openapi():
    with open("../frontend/openapi.json", "w") as f:
        json.dump(app.openapi(), f, indent=2)
    print("OpenAPI schema generated and saved to ../frontend/openapi.json")


if __name__ == "__main__":
    generate_openapi()
