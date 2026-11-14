from django.contrib.auth import get_user_model
from django.db.models import Q, Sum
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from store.models import Event, Product

from .models import Order
from .serializers import AdminOrderSerializer, OrderSerializer, PlaceOrderSerializer
from .whatsapp import send_order_confirmation


def order_queryset():
    return Order.objects.select_related("user").prefetch_related(
        "items__product__images")


class OrderListCreateView(generics.ListAPIView):
    """GET: the signed-in user's order history. POST: place an order from the cart."""

    serializer_class = OrderSerializer

    def get_queryset(self):
        return order_queryset().filter(user=self.request.user)

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        # The order is committed at this point; the message is sent afterwards.
        send_order_confirmation(order)
        order = order_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    lookup_field = "order_id"

    def get_queryset(self):
        return order_queryset().filter(user=self.request.user)


class AdminOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                        mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminOrderSerializer
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = order_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(order_id__icontains=search) | Q(full_name__icontains=search)
                           | Q(phone__icontains=search) | Q(user__email__icontains=search))
        return qs

    @action(detail=True, methods=["post"], url_path="resend-whatsapp")
    def resend_whatsapp(self, request, pk=None):
        order = self.get_object()
        send_order_confirmation(order)
        return Response(self.get_serializer(order).data)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        live_orders = Order.objects.exclude(status=Order.Status.CANCELLED)
        active = Event.objects.filter(is_active=True).first()
        return Response({
            "products": Product.objects.count(),
            "low_stock": Product.objects.filter(is_active=True, stock__lte=5).count(),
            "users": get_user_model().objects.count(),
            "orders": Order.objects.count(),
            "revenue": live_orders.aggregate(total=Sum("total"))["total"] or 0,
            "active_event": active.name if active else None,
        })
