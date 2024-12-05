import os
import asyncio
from typing import List, Dict, Any
import pathlib

class FileTools:
    def __init__(self, allowed_directories: List[str]):
        self.allowed_directories = [os.path.abspath(d) for d in allowed_directories]

    def _validate_path(self, path: str) -> str:
        abs_path = os.path.abspath(path)
        if not any(abs_path.startswith(d) for d in self.allowed_directories):
            raise ValueError(f"Path {path} not in allowed directories")
        return abs_path

    async def read_file(self, path: str) -> str:
        path = self._validate_path(path)
        async with asyncio.Lock():
            with open(path, 'r') as f:
                return f.read()

    async def write_file(self, path: str, content: str) -> str:
        path = self._validate_path(path)
        async with asyncio.Lock():
            with open(path, 'w') as f:
                f.write(content)
        return f"File {path} written successfully"

    async def list_directory(self, path: str) -> str:
        path = self._validate_path(path)
        entries = os.listdir(path)
        formatted = [f"[DIR] {e}" if os.path.isdir(os.path.join(path, e)) 
                    else f"[FILE] {e}" for e in entries]
        return "\n".join(formatted)

    async def get_file_info(self, path: str) -> Dict[str, Any]:
        path = self._validate_path(path)
        stats = os.stat(path)
        return {
            "size": stats.st_size,
            "created": stats.st_ctime,
            "modified": stats.st_mtime,
            "is_dir": os.path.isdir(path)
        }

    async def create_directory(self, path: str) -> str:
        path = self._validate_path(path)
        os.makedirs(path, exist_ok=True)
        return f"Directory {path} created successfully"