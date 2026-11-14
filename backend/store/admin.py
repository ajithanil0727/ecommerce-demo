from django.contrib import admin

from .models import Event, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "stock", "is_active"]
    search_fields = ["name", "category"]
    filter_horizontal = ["events"]
    inlines = [ProductImageInline]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active"]
