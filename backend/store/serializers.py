from rest_framework import serializers

from .models import Event, Product, ProductImage


class EventSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Event
        fields = ["id", "name", "slug", "emoji", "headline", "subheadline", "banner_image",
                  "primary_color", "accent_color", "background_color", "is_active",
                  "product_count"]
        read_only_fields = ["id", "slug"]


class EventTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "name", "slug", "emoji"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "sort_order"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    events = EventTagSerializer(many=True, read_only=True)
    # Admin writes event tags as a list of ids.
    event_ids = serializers.PrimaryKeyRelatedField(
        source="events", queryset=Event.objects.all(), many=True, write_only=True,
        required=False)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "category", "description", "price", "mrp", "stock",
                  "is_active", "images", "events", "event_ids", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        if price is not None and price <= 0:
            raise serializers.ValidationError({"price": "Price must be greater than zero."})
        if mrp is not None and price is not None and mrp < price:
            raise serializers.ValidationError({"mrp": "MRP cannot be lower than the price."})
        return attrs
