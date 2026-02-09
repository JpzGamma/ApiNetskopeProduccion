# app/services/netskopeChatService.py
import requests
import os

# URL del webhook de n8n (configúrala en tu .env)
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "https://ops-tds.gammaingenieros.com/webhook/tds")

def send_message_to_n8n(question: str) -> str:
    """
    Envía un mensaje al flujo n8n (AI Agent de Netskope) y devuelve la respuesta.
    """
    try:
        payload = {"chatInput": question}
        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=60)
        response.raise_for_status()

        data = response.json()
        # n8n podría devolver "reply", "text", o un array según cómo configuraste el nodo final
        return data.get("reply") or data.get("answer") or "Sin respuesta del modelo 🤖"

    except requests.RequestException as e:
        raise Exception(f"Error al conectar con n8n: {e}")