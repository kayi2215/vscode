import os
import asyncio
import shutil
from typing import List, Dict, Any
from pathlib import Path

class FileManager:
    def __init__(self, allowed_directories: List[str]):
        """
        Initialise le gestionnaire de fichiers avec une liste de répertoires autorisés.
        
        Args:
            allowed_directories: Liste des chemins des répertoires autorisés
        """
        self.allowed_directories = [os.path.abspath(d) for d in allowed_directories]

    def _validate_path(self, path: str) -> str:
        """
        Vérifie si le chemin est dans un répertoire autorisé et retourne le chemin absolu.
        
        Args:
            path: Chemin à valider
            
        Returns:
            Le chemin absolu validé
            
        Raises:
            ValueError: Si le chemin n'est pas dans un répertoire autorisé
        """
        abs_path = os.path.abspath(path)
        if not any(abs_path.startswith(d) for d in self.allowed_directories):
            raise ValueError(f"Path {path} not in allowed directories")
        return abs_path

    async def read_file(self, path: str) -> str:
        """
        Lit le contenu d'un fichier de manière asynchrone.
        
        Args:
            path: Chemin du fichier à lire
            
        Returns:
            Le contenu du fichier
        """
        path = self._validate_path(path)
        async with asyncio.Lock():
            with open(path, 'r') as f:
                return f.read()

    async def write_file(self, path: str, content: str) -> str:
        """
        Écrit du contenu dans un fichier de manière asynchrone.
        
        Args:
            path: Chemin du fichier à écrire
            content: Contenu à écrire
            
        Returns:
            Message de confirmation
        """
        path = self._validate_path(path)
        async with asyncio.Lock():
            with open(path, 'w') as f:
                f.write(content)
        return f"File {path} written successfully"

    async def list_directory(self, path: str) -> str:
        """
        Liste le contenu d'un répertoire.
        
        Args:
            path: Chemin du répertoire à lister
            
        Returns:
            Liste formatée des fichiers et dossiers
        """
        path = self._validate_path(path)
        entries = os.listdir(path)
        formatted = [f"[DIR] {e}" if os.path.isdir(os.path.join(path, e)) 
                    else f"[FILE] {e}" for e in entries]
        return "\n".join(formatted)

    async def get_file_info(self, path: str) -> Dict[str, Any]:
        """
        Récupère les informations sur un fichier.
        
        Args:
            path: Chemin du fichier
            
        Returns:
            Dictionnaire contenant les informations du fichier
        """
        path = self._validate_path(path)
        stats = os.stat(path)
        return {
            "size": stats.st_size,
            "created": stats.st_ctime,
            "modified": stats.st_mtime,
            "is_dir": os.path.isdir(path)
        }

    async def create_directory(self, path: str) -> str:
        """
        Crée un nouveau répertoire.
        
        Args:
            path: Chemin du répertoire à créer
            
        Returns:
            Message de confirmation
        """
        path = self._validate_path(path)
        os.makedirs(path, exist_ok=True)
        return f"Directory {path} created successfully"

    async def delete_file(self, path: str) -> Dict[str, Any]:
        """
        Supprime un fichier ou un répertoire.
        
        Args:
            path: Chemin à supprimer
            
        Returns:
            Dictionnaire contenant le statut et le message
        """
        path = self._validate_path(path)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Path does not exist: {path}")
        
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
            return {
                "success": True,
                "message": f"Successfully deleted: {path}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error deleting {path}: {str(e)}"
            }
