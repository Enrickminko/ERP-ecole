import time
import requests
import concurrent.futures

URL = "http://127.0.0.1:8000/api/v1/auth/login/"
TOTAL_REQUESTS = 20

def send_request(req_id):
    start = time.time()
    try:
        response = requests.post(URL, json={"email": "test@test.com", "password": "wrong"})
        elapsed = round((time.time() - start) * 1000, 2)
        return response.status_code, elapsed
    except Exception as e:
        return None, 0

print(f"🚀 Lancement du test de charge (Envoi de {TOTAL_REQUESTS} requêtes simultanées)...")
start_total = time.time()

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(send_request, range(TOTAL_REQUESTS)))

times = [t for status, t in results if status is not None]
status_codes = [status for status, t in results]

print("\n--- 📊 RÉSULTATS DU TEST DE PERFORMANCE ---")
print(f"✅ Requêtes traitées : {len(times)}/{TOTAL_REQUESTS}")
print(f"⏱️ Temps de réponse moyen : {round(sum(times)/len(times), 2)} ms")
print(f"⚡ Temps total du test : {round(time.time() - start_total, 2)} s")
print(f"🔒 Codes HTTP reçus : {set(status_codes)}")
if 429 in status_codes:
    print("🎯 Rate Limiting activé (Erreur 429 Too Many Requests détectée) !")