from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", health),
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("store.urls")),
    path("api/", include("orders.urls")),
    # Demo-scale media serving (uploaded product photos), also in production.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
