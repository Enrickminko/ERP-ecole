import pika
import json
import os

def publish_user_created_event(user_data):

    try:
        rabbitmq_host = os.environ.get('RABBITMQ_HOST', 'rabbitmq')
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host, port=5672)
        )
        channel = connection.channel()

    
        channel.queue_declare(queue='user_created', durable=True)

        message = json.dumps(user_data)

        channel.basic_publish(
            exchange='',
            routing_key='user_created', 
            body=message
        )
        
        print(f" [x] Événement envoyé à RabbitMQ: {message}")
        connection.close()

    except Exception as e:

        print(f" ❌ Erreur lors de l'envoi de l'événement RabbitMQ : {e}")