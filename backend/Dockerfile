# The backend: the API, on port 8000.
FROM python:3.12-slim

# Print output straight away, and write no .pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Run as a normal user, not root
RUN useradd --create-home app && mkdir /app && chown app /app
WORKDIR /app

# Install the packages first, so a code change doesn't reinstall them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app . .
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
