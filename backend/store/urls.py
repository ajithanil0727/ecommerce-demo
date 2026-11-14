from django.urls import include, path
from rest_framework.routers import SimpleRouter

from accounts.views import AdminUserViewSet

from . import views

router = SimpleRouter()
router.register("products", views.AdminProductViewSet, basename="admin-product")
router.register("events", views.AdminEventViewSet, basename="admin-event")
router.register("users", AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("storefront/", views.StorefrontView.as_view()),
    path("products/", views.ProductListView.as_view()),
    path("products/<slug:slug>/", views.ProductDetailView.as_view()),
    path("admin/images/<int:pk>/", views.AdminProductImageView.as_view()),
    path("admin/", include(router.urls)),
]
