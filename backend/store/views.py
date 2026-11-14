from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event, Product, ProductImage
from .serializers import EventSerializer, ProductImageSerializer, ProductSerializer

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def product_queryset():
    return Product.objects.prefetch_related("images", "events")


def filter_products(qs, params):
    search = params.get("search")
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(category__icontains=search)
                       | Q(description__icontains=search))
    event = params.get("event")
    if event:
        qs = qs.filter(events__slug=event)
    category = params.get("category")
    if category:
        qs = qs.filter(category__iexact=category)
    return qs.distinct()


# ---------- Public storefront ----------

class StorefrontView(APIView):
    """Home page data: the active event (if any) and the products to feature.
    With an active event only products tagged with it are listed."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        event = Event.objects.filter(is_active=True).first()
        products = product_queryset().filter(is_active=True)
        if event:
            products = products.filter(events=event)
        ctx = {"request": request}
        return Response({
            "event": EventSerializer(event, context=ctx).data if event else None,
            "products": ProductSerializer(products, many=True, context=ctx).data,
        })


class ProductListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return filter_products(product_queryset().filter(is_active=True),
                               self.request.query_params)


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return product_queryset().filter(is_active=True)


# ---------- Admin ----------

class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return filter_products(product_queryset(), self.request.query_params)

    @action(detail=True, methods=["post"])
    def images(self, request, pk=None):
        """Upload one (already cropped) photo for this product."""
        product = self.get_object()
        upload = request.FILES.get("image")
        if not upload:
            return Response({"detail": "No image file was sent."},
                            status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_IMAGE_BYTES:
            return Response({"detail": "Image must be smaller than 5 MB."},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = ProductImageSerializer(
            data={"image": upload, "sort_order": product.images.count()},
            context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminProductImageView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    queryset = ProductImage.objects.all()


class AdminEventViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = EventSerializer
    queryset = Event.objects.all()

    def perform_update(self, serializer):
        event = serializer.save()
        # File inputs cannot send "empty", so removing the banner is a separate flag.
        if self.request.data.get("remove_banner") in ("true", True) and event.banner_image:
            event.banner_image.delete(save=True)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        event = self.get_object()
        event.is_active = True
        event.save()
        return Response(self.get_serializer(event).data)

    @action(detail=False, methods=["post"])
    def deactivate(self, request):
        """Back to the regular, non-festive store."""
        Event.objects.filter(is_active=True).update(is_active=False)
        return Response({"detail": "No event is active."})
