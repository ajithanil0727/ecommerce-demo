FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Static files for the Django admin are baked into the image.
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# On start: apply migrations, make sure demo data exists, then serve.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_demo && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 60"]
