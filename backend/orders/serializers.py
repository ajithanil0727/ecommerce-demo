from django.db import transaction
from rest_framework import serializers

from store.models import Product

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True, default=None)
    image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_slug", "product_name", "price", "quantity",
                  "subtotal", "image"]

    def get_image(self, item):
        if not item.product:
            return None
        first = next(iter(item.product.images.all()), None)
        if not first:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(first.image.url) if request else first.image.url


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "order_id", "customer_email", "full_name", "phone", "address", "city",
                  "pincode", "total", "status", "whatsapp_status", "whatsapp_detail",
                  "created_at", "items"]
        read_only_fields = fields


class AdminOrderSerializer(OrderSerializer):
    """Admins may only change the status."""

    class Meta(OrderSerializer.Meta):
        read_only_fields = [f for f in OrderSerializer.Meta.fields if f != "status"]


class CartLineSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class PlaceOrderSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(
        r"^\+?[\d\s-]{10,16}$", max_length=20,
        error_messages={"invalid": "Enter a valid WhatsApp number, e.g. 9876543210."})
    address = serializers.CharField()
    city = serializers.CharField(max_length=80)
    pincode = serializers.CharField(max_length=12)
    items = CartLineSerializer(many=True, allow_empty=False)

    @transaction.atomic
    def create(self, validated_data):
        lines = validated_data.pop("items")
        quantities = {}
        for line in lines:
            quantities[line["product"]] = quantities.get(line["product"], 0) + line["quantity"]

        # Lock the rows so two simultaneous orders cannot oversell the same stock.
        products = {p.id: p for p in Product.objects.select_for_update()
                    .filter(id__in=quantities, is_active=True)}
        problems = []
        for product_id, quantity in quantities.items():
            product = products.get(product_id)
            if product is None:
                problems.append("An item in your cart is no longer available.")
            elif product.stock < quantity:
                left = f"only {product.stock} left" if product.stock else "out of stock"
                problems.append(f"{product.name}: {left}.")
        if problems:
            raise serializers.ValidationError({"items": problems})

        order = Order.objects.create(user=self.context["request"].user, **validated_data)
        total = 0
        for product_id, quantity in quantities.items():
            product = products[product_id]
            OrderItem.objects.create(order=order, product=product, product_name=product.name,
                                     price=product.price, quantity=quantity)
            product.stock -= quantity
            product.save(update_fields=["stock"])
            total += product.price * quantity
        order.total = total
        order.save(update_fields=["total"])
        return order
