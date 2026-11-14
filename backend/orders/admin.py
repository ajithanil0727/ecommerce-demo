from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_id", "full_name", "phone", "total", "status", "whatsapp_status",
                    "created_at"]
    search_fields = ["order_id", "full_name", "phone"]
    inlines = [OrderItemInline]
