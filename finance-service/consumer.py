import pika
import json
import time

def start_consumer():
    while True:
        try:
            print(" ⏳ [Finance Service] Tentative de connexion à RabbitMQ...")
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host='rabbitmq', port=5672)
            )
            channel = connection.channel()
            channel.queue_declare(queue='user_created', durable=True)
            print(" ✅ [Finance Service] Connecté avec succès à RabbitMQ ! En attente d'événements...")

            def callback(ch, method, properties, body):
                event = json.loads(body)
                email = event.get('email', 'Inconnu')
                username = event.get('username', 'Inconnu')
                
                print(f"\n [📩 Événement Reçu] Nouveau compte détecté pour: {username} ({email})")
                print(f" ⚙️ [Traitement] Génération automatique de la facture de scolarité (450,000 FCFA)...")
                time.sleep(1)
                print(f" ✅ [Facture Créée] Facture #INV-2026-{username.upper()} enregistrée pour {email} !\n")

            channel.basic_consume(queue='user_created', on_message_callback=callback, auto_ack=True)
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError:
            print(" ⚠️ RabbitMQ n'est pas encore prêt. Nouvelle tentative dans 5 secondes...")
            time.sleep(5)

if __name__ == '__main__':
    start_consumer()