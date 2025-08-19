# Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run the application
#CMD ["flask", "run", "--host=0.0.0.0"]
CMD ["python", "-m" , "flask", "run", "--host=0.0.0.0"]