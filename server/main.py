"""AI Chat 部署服务: 单进程托管 React 构建产物 (平台部署要求)"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

DIST = Path(__file__).resolve().parent.parent / "dist"

app = FastAPI(title="AI Chat Web")


@app.get("/health")
def health():
    return {"status": "ok"}


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        """SPA 回退: 命中文件则返回文件, 否则返回 index.html"""
        f = DIST / path
        if path and f.is_file():
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
else:
    @app.get("/")
    def no_build():
        return JSONResponse(
            {"error": "dist 不存在, 请先执行 npm run build"}, status_code=500
        )
