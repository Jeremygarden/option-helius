FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS deps
RUN pip install --upgrade pip uv -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY requirements.txt ./
RUN uv pip install --system -r requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple

FROM base AS runtime
COPY --from=deps /usr/local /usr/local
COPY app ./app
RUN addgroup --system app && adduser --system --ingroup app app
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
