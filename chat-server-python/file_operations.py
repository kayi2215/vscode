import os
import shutil
from pathlib import Path

class FileOperations:
    def __init__(self, allowed_directory):
        self.allowed_directory = Path(allowed_directory)

    def is_path_allowed(self, path):
        """Vérifie si le chemin est dans le répertoire autorisé"""
        try:
            path = Path(path).resolve()
            return str(path).startswith(str(self.allowed_directory))
        except Exception:
            return False

    def delete_file(self, file_path):
        """Supprime un fichier ou un dossier s'il est dans le répertoire autorisé"""
        if not self.is_path_allowed(file_path):
            raise PermissionError(f"Cannot delete files outside of {self.allowed_directory}")
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: {file_path}")
        
        try:
            if path.is_file():
                os.remove(path)
            elif path.is_dir():
                shutil.rmtree(path)
            return {"success": True, "message": f"Successfully deleted: {file_path}"}
        except Exception as e:
            return {"success": False, "message": f"Error deleting {file_path}: {str(e)}"}
