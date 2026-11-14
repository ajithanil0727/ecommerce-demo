from django.db import models
from django.utils.text import slugify


def unique_slug(model, name, instance_pk=None):
    base = slugify(name) or "item"
    slug, n = base, 2
    while model.objects.filter(slug=slug).exclude(pk=instance_pk).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class Event(models.Model):
    """A festive occasion (Diwali, Christmas...). At most one is active at a time;
    the active one re-themes the home page and decides which products it lists."""

    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    emoji = models.CharField(max_length=8, blank=True)
    headline = models.CharField(max_length=120, blank=True)
    subheadline = models.CharField(max_length=240, blank=True)
    banner_image = models.ImageField(upload_to="events/", blank=True)
    primary_color = models.CharField(max_length=9, default="#4f46e5")
    accent_color = models.CharField(max_length=9, default="#f59e0b")
    background_color = models.CharField(max_length=9, default="#f8fafc")
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Event, self.name, self.pk)
        super().save(*args, **kwargs)
        if self.is_active:
            Event.objects.exclude(pk=self.pk).filter(is_active=True).update(is_active=False)


class Product(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    category = models.CharField(max_length=60, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                              help_text="Original price, shown struck through")
    stock = models.PositiveIntegerField(default=0)
    events = models.ManyToManyField(Event, blank=True, related_name="products")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Product, self.name, self.pk)
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def delete(self, *args, **kwargs):
        storage, name = self.image.storage, self.image.name
        super().delete(*args, **kwargs)
        if name:
            storage.delete(name)
