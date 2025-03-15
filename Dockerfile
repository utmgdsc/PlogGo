# Use official Python image as base
FROM python:3.11-slim

# Set working directory in the container
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app

# Expose port 80
EXPOSE 80

# Run Gunicorn WSGI server
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:80", "--access-logfile", "-", "--error-logfile", "-", "app:app"]