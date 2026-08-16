"""AI Chat 部署服务: 单进程托管 React 构建产物 + /backend 反向代理

平台规则: 单进程单端口, 必须读取 PORT 环境变量。
- 托管 dist 静态文件 (SPA 回退)
- /backend/* 代理到平台后端 (浏览器同源请求, 服务端转发, 无 CORS 问题)
"""
import os
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# 平台后端地址 (部署时容器内已被注入 AI_BUILDER_TOKEN, 但本应用使用浏览器侧 Key)
BACKEND_ORIGIN = os.environ.get("AI_BUILDER_BACKEND", "https://space.ai-builders.com")

# 兼容多种部署布局: /app/dist (Dockerfile), <repo>/dist (本地直跑)
_HERE = Path(__file__).resolve().parent
_candidates = []
if os.environ.get("DIST_DIR"):
    _candidates.append(Path(os.environ["DIST_DIR"]))
_candidates += [_HERE.parent / "dist", _HERE / "dist"]
DIST = next((p for p in _candidates if p.is_dir()), None)

app = FastAPI(title="AI Chat Web")


@app.get("/health")
def health():
    return {"status": "ok", "dist": str(DIST) if DIST else None}


# ---------------- /backend 反向代理 (流式) ----------------
@app.api_route("/backend/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def backend_proxy(path: str, request: Request):
    url = f"{BACKEND_ORIGIN}/backend/{path}"
    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length", "connection")
    }
    body = await request.body()

    client = httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=30.0))
    req = client.build_request(request.method, url, headers=headers, content=body)
    resp = await client.send(req, stream=True)

    async def gen():
        try:
            async for chunk in resp.aiter_raw():
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        gen(),
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type") or "application/json",
        headers={
            k: v
            for k, v in resp.headers.items()
            if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
        },
    )


# ---------------- 静态托管 ----------------
if DIST is not None:
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        """SPA 回退: 命中文件则返回文件, 否则返回 index.html"""
        f = DIST / path
        if path and f.is_file():
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def no_build():
        return JSONResponse(
            {"error": "dist 不存在, 请先执行 npm run build"}, status_code=500
        )
