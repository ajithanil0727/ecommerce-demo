"""Order-confirmation WhatsApp messages.

Sent through Twilio's WhatsApp API when TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are set.
Without them the message is written to the server log and stored on the order, so the
demo works end to end before any provider is configured.

Two sending modes:
- Free text (default): our own confirmation wording. Works with the Twilio Sandbox and
  with an approved WhatsApp sender inside the 24-hour customer window.
- Template: when TWILIO_CONTENT_SID is set, that pre-approved template is sent instead,
  with the order id as variable 1. Twilio trial accounts only allow this mode.
"""
import json
import logging
import re

import requests
from django.conf import settings

from .models import Order

logger = logging.getLogger("orders")


def to_e164(phone):
    """'98765 43210' -> '+919876543210'. Numbers already carrying a country code are kept."""
    raw = phone.strip()
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+"):
        return f"+{digits}"
    digits = digits.lstrip("0")
    if len(digits) == 10:
        digits = settings.DEFAULT_COUNTRY_CODE + digits
    return f"+{digits}"


def build_message(order):
    lines = [f"• {item.product_name} × {item.quantity}" for item in order.items.all()]
    return (
        f"Hi {order.full_name}, thank you for shopping with {settings.STORE_NAME}! 🎉\n\n"
        f"Your order *{order.order_id}* is confirmed.\n\n"
        + "\n".join(lines)
        + f"\n\nTotal: ₹{order.total}\n"
        f"Delivering to: {order.address}, {order.city} - {order.pincode}\n\n"
        "We'll message you again when it ships."
    )


def twilio_payload(order, to, body):
    payload = {"From": settings.TWILIO_WHATSAPP_FROM, "To": f"whatsapp:{to}"}
    if settings.TWILIO_CONTENT_SID:
        payload["ContentSid"] = settings.TWILIO_CONTENT_SID
        payload["ContentVariables"] = json.dumps({"1": order.order_id})
    else:
        payload["Body"] = body
    return payload


def send_order_confirmation(order):
    """Send (or log) the confirmation and record the outcome on the order. Never raises:
    a WhatsApp problem must not undo a placed order."""
    body = build_message(order)
    to = to_e164(order.phone)

    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        logger.info("WhatsApp (not configured, logging only) to %s:\n%s", to, body)
        status, detail = Order.WhatsAppStatus.LOGGED, body
    else:
        try:
            response = requests.post(
                "https://api.twilio.com/2010-04-01/Accounts/"
                f"{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                data=twilio_payload(order, to, body),
                timeout=15,
            )
            if response.ok:
                status = Order.WhatsAppStatus.SENT
                detail = f"Sent to {to}" + (
                    f" using template {settings.TWILIO_CONTENT_SID}"
                    if settings.TWILIO_CONTENT_SID else f":\n{body}")
            else:
                try:
                    reason = response.json().get("message", response.text)
                except ValueError:
                    reason = response.text
                status = Order.WhatsAppStatus.FAILED
                detail = f"Twilio error {response.status_code}: {reason}"
                logger.warning("WhatsApp to %s failed: %s", to, detail)
        except requests.RequestException as exc:
            status, detail = Order.WhatsAppStatus.FAILED, f"Could not reach Twilio: {exc}"
            logger.warning("WhatsApp to %s failed: %s", to, detail)

    order.whatsapp_status = status
    order.whatsapp_detail = detail
    order.save(update_fields=["whatsapp_status", "whatsapp_detail"])
    return status
