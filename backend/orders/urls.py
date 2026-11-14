from django.urls import include, path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("orders", views.AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("orders/", views.OrderListCreateView.as_view()),
    path("orders/<str:order_id>/", views.OrderDetailView.as_view()),
    path("admin/stats/", views.AdminStatsView.as_view()),
    path("admin/", include(router.urls)),
]
