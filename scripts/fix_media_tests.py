import sys


def fix_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Fix isolation test
    content = content.replace(
        'files = {"file": ("user_file.jpg", sample_image_data, "image/jpeg")}',
        'files = {"file": ("user_file.jpg", sample_image_data + b"user", "image/jpeg")}',
    )
    content = content.replace(
        'files = {"file": ("admin_file.jpg", sample_image_data, "image/jpeg")}',
        'files = {"file": ("admin_file.jpg", sample_image_data + b"admin", "image/jpeg")}',
    )

    # Fix loops
    # This is tricky because "sample_image_data" appears in "files = ..." inside loops.
    # We can use regex to replace `sample_image_data` with `sample_image_data + str(i).encode()` ONLY inside loops?
    # Or just replace `files = {"file": (f"{usage}.jpg", sample_image_data, "image/jpeg")}`

    # Pagination loop
    if (
        'files = {"file": (f"file_{i}.jpg", sample_image_data, "image/jpeg")}'
        in content
    ):
        content = content.replace(
            'files = {"file": (f"file_{i}.jpg", sample_image_data, "image/jpeg")}',
            'files = {"file": (f"file_{i}.jpg", sample_image_data + str(i).encode(), "image/jpeg")}',
        )

    if (
        'files = {"file": (f"page_file_{i}.jpg", sample_image_data, "image/jpeg")}'
        in content
    ):
        content = content.replace(
            'files = {"file": (f"page_file_{i}.jpg", sample_image_data, "image/jpeg")}',
            'files = {"file": (f"page_file_{i}.jpg", sample_image_data + str(i).encode(), "image/jpeg")}',
        )

    # Usage filter loop
    if 'files = {"file": (f"{usage}.jpg", sample_image_data, "image/jpeg")}' in content:
        content = content.replace(
            'files = {"file": (f"{usage}.jpg", sample_image_data, "image/jpeg")}',
            'files = {"file": (f"{usage}.jpg", sample_image_data + usage.encode(), "image/jpeg")}',
        )

    # Combined filter loop
    # This one iterates `for filename, usage, description in test_files:`
    # `files = {"file": (filename, sample_image_data, "image/jpeg")}`
    if 'files = {"file": (filename, sample_image_data, "image/jpeg")}' in content:
        content = content.replace(
            'files = {"file": (filename, sample_image_data, "image/jpeg")}',
            'files = {"file": (filename, sample_image_data + filename.encode(), "image/jpeg")}',
        )

    # Sorting loop
    # `for filename in filenames:`
    if 'files = {"file": (filename, sample_image_data, "image/jpeg")}' in content:
        content = content.replace(
            'files = {"file": (filename, sample_image_data, "image/jpeg")}',
            'files = {"file": (filename, sample_image_data + filename.encode(), "image/jpeg")}',
        )

    with open(filepath, "w") as f:
        f.write(content)
    print(f"Fixed {filepath}")


if __name__ == "__main__":
    for f in sys.argv[1:]:
        fix_file(f)
