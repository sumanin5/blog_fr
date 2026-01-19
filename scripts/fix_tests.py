import sys


def fix_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Ensure pytest is imported
    if "import pytest" not in content:
        content = "import pytest\n" + content

    lines = content.split("\n")
    new_lines = []

    in_test_class = False

    for i, line in enumerate(lines):
        # Add await to .process() calls
        if "PostProcessor(content).process()" in line and "await" not in line:
            line = line.replace(
                "PostProcessor(content).process()",
                "await PostProcessor(content).process()",
            )

        if "processor.process()" in line and "await" not in line:
            line = line.replace("processor.process()", "await processor.process()")

        # Convert test methods to async
        strip_line = line.strip()
        if strip_line.startswith("class Test"):
            in_test_class = True
            new_lines.append(line)
            continue

        if strip_line.startswith("def test_"):
            indent = line[: line.find("def")]
            # Check if previous line is already @pytest.mark.asyncio
            prev_line = new_lines[-1].strip() if new_lines else ""
            if prev_line != "@pytest.mark.asyncio":
                new_lines.append(f"{indent}@pytest.mark.asyncio")

            new_lines.append(line.replace("def test_", "async def test_"))
            continue

        new_lines.append(line)

    with open(filepath, "w") as f:
        f.write("\n".join(new_lines))
    print(f"Fixed {filepath}")


if __name__ == "__main__":
    for f in sys.argv[1:]:
        fix_file(f)
