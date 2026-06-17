FROM python:3.11-slim

WORKDIR /app

RUN pip install uv -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY pyproject.toml requirements.txt ./
RUN uv pip install --system -r requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
