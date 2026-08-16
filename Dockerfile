# 构建阶段: Node 编译 React 产物
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段: Python 单进程托管静态文件
FROM python:3.11-slim
WORKDIR /app
COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=build /app/dist ./dist
COPY server/main.py ./main.py

EXPOSE 8000
# 平台要求: 必须使用 shell 形式并读取 PORT 环境变量
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
