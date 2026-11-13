# The backend. For now it runs the checker once on every file in data/.
# The API will replace the CMD line.
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

# Prints the report and saves chart.png inside the container
CMD ["python", "checker.py"]
