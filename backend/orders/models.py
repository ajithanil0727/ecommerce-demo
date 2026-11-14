import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from store.models import Product

# No 0/O/1/I so the id is easy to read out loud.
ORDER_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_order_id():
    """e.g. ORD-20261113-7K2QX9 — date plus 6 random characters, checked for uniqueness."""
    date = timezone.localdate().strftime("%Y%m%d")
    while True:
        suffix = "".join(secrets.choice(ORDER_ID_ALPHABET) for _ in range(6))
        order_id = f"ORD-{date}-{suffix}"
        if not Order.objects.filter(order_id=order_id).exists():
            return order_id


class Order(models.Model):
    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class WhatsAppStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        LOGGED = "logged", "Logged (no provider configured)"
        FAILED = "failed", "Failed"

    order_id = models.CharField(max_length=24, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="orders")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=80)
    pincode = models.CharField(max_length=12)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PLACED)
    whatsapp_status = models.CharField(max_length=10, choices=WhatsAppStatus.choices,
                                       default=WhatsAppStatus.PENDING)
    whatsapp_detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.order_id

    def save(self, *args, **kwargs):
        if not self.order_id:
            self.order_id = generate_order_id()
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True,
                                related_name="order_items")
    # Snapshot, so history stays correct if the product later changes or is deleted.
    product_name = models.CharField(max_length=160)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def subtotal(self):
        return self.price * self.quantity
