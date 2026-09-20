FROM python:3.11-slim
WORKDIR /app
COPY aha/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY aha/ ./
EXPOSE 8000
CMD sh -c "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"
