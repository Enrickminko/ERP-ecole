import pika
import json

def publish_user_created_event(user_data):
    """
    Publie un événement dans la file RabbitMQ lorsqu'un nouvel utilisateur est créé.
    """
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host='rabbitmq', port=5672)
        )
        channel = connection.channel()

        channel.queue_declare(queue='user_notifications', durable=True)

        message = json.dumps({
            'event': 'USER_REGISTERED',
            'email': user_data.get('email'),
            'username': user_data.get('username')
        })

        channel.basic_publish(
            exchange='',
            routing_key='user_notifications',
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2, 
            )
        )
        print(f" [x] Événement envoyé à RabbitMQ: {message}")
        connection.close()

    except Exception as e:
        print(f" [!] Erreur d'envoi RabbitMQ (non-bloquant): {e}")