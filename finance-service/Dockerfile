FROM python:3.10-slim

WORKDIR /app

RUN pip install pika

COPY consumer.py .

CMD ["python", "consumer.py"]