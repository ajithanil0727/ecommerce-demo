"""Fill the store with demo events, products (with generated photos) and two accounts.

    python manage.py seed_demo           # only seeds an empty store
    python manage.py seed_demo --reset   # wipes products/events/orders first
"""
import colorsys
import io
import random

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image, ImageDraw, ImageFont

from orders.models import Order
from store.models import Event, Product, ProductImage

ADMIN_EMAIL, ADMIN_PASSWORD = "admin@shopfest.demo", "admin12345"
CUSTOMER_EMAIL, CUSTOMER_PASSWORD = "customer@shopfest.demo", "demo12345"

EVENTS = [
    dict(name="Diwali", emoji="🪔", headline="Festival of Lights Sale",
         subheadline="Diyas, sweets and festive wear to light up your celebrations.",
         primary_color="#b45309", accent_color="#f59e0b", background_color="#fff7ed"),
    dict(name="Christmas", emoji="🎄", headline="Merry Christmas Store",
         subheadline="Trees, treats and gifts for everyone on your list.",
         primary_color="#b91c1c", accent_color="#15803d", background_color="#f0fdf4"),
    dict(name="New Year", emoji="🎆", headline="New Year, New Finds",
         subheadline="Start the year with fresh picks at fresh prices.",
         primary_color="#6d28d9", accent_color="#db2777", background_color="#faf5ff"),
]

# name, category, price, mrp, stock, hue (0-360), events, description
PRODUCTS = [
    ("Handcrafted Clay Diya Set (12 pcs)", "Decor", 299, 449, 60, 28, ["Diwali"],
     "Twelve hand-painted terracotta diyas made by local artisans. Reusable and oil-ready."),
    ("Brass Lakshmi Pooja Thali", "Decor", 1299, 1799, 18, 45, ["Diwali"],
     "A polished brass thali set with bell, diya, incense holder and kumkum bowls."),
    ("Premium Dry Fruit Gift Box", "Food", 899, 1199, 40, 18, ["Diwali", "New Year"],
     "Almonds, cashews, pistachios and raisins in a festive keepsake box. 500 g."),
    ("Rangoli Colour Kit (10 shades)", "Decor", 249, 349, 75, 320, ["Diwali"],
     "Ten vivid, skin-safe rangoli powders with two stencils for easy patterns."),
    ("Silk Blend Festive Kurta", "Fashion", 1599, 2499, 25, 350, ["Diwali"],
     "A soft silk-blend kurta with subtle zari work. Regular fit, sizes S to XXL."),
    ("Warm White Fairy Lights (10 m)", "Decor", 399, 599, 90, 52, ["Diwali", "Christmas", "New Year"],
     "100 warm LEDs on a 10 metre copper wire with eight lighting modes. USB powered."),
    ("Pre-lit Christmas Tree (5 ft)", "Decor", 2499, 3499, 12, 140, ["Christmas"],
     "A full 5 ft tree with built-in lights and a sturdy metal stand. Sets up in minutes."),
    ("Glass Ornament Set (24 pcs)", "Decor", 699, 999, 35, 0, ["Christmas"],
     "Shatter-resistant baubles in red, gold and frosted white, with hanging strings."),
    ("Rich Plum Cake (800 g)", "Food", 549, 699, 30, 12, ["Christmas"],
     "Slow-baked plum cake packed with rum-soaked fruit and nuts. Egg-free option inside."),
    ("Santa Hat & Stocking Combo", "Fashion", 349, 499, 50, 355, ["Christmas"],
     "A plush Santa hat with a matching stocking, ready to fill with treats."),
    ("Party Popper & Sparkler Pack", "Party", 449, 599, 45, 280, ["New Year"],
     "Twelve confetti poppers and twenty cold sparklers for a midnight countdown."),
    ("2027 Weekly Planner", "Stationery", 399, 549, 55, 260, ["New Year"],
     "A hardbound weekly planner with goal pages, habit trackers and a ribbon marker."),
    ("Wireless Noise-Cancelling Headphones", "Electronics", 3999, 5999, 20, 215, [],
     "Over-ear headphones with active noise cancellation and 30 hours of battery life."),
    ("Everyday Canvas Backpack", "Fashion", 1199, 1699, 28, 190, [],
     "A 22 L water-resistant backpack with a padded laptop sleeve and side pockets."),
    ("Insulated Steel Water Bottle (1 L)", "Home", 599, 799, 65, 170, [],
     "Double-walled steel keeps drinks cold for 24 hours or hot for 12. Leak-proof."),
    ("Ceramic Coffee Mug Set (2 pcs)", "Home", 449, 649, 4, 95, [],
     "Two glazed ceramic mugs, 330 ml each. Microwave and dishwasher safe."),
]


def rgb(hue, saturation, value):
    r, g, b = colorsys.hsv_to_rgb((hue % 360) / 360, saturation, value)
    return int(r * 255), int(g * 255), int(b * 255)


def wrap(draw, text, font, max_width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def make_photo(name, hue, variant):
    """A simple generated 'product photo': gradient backdrop, soft shapes, product name."""
    size = 800
    rng = random.Random(f"{name}-{variant}")
    hue = hue + variant * 14
    top, bottom = rgb(hue, 0.18, 0.99), rgb(hue + 20, 0.42, 0.9)
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(size):
        t = y / size
        draw.line([(0, y), (size, y)],
                  fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    for _ in range(5 + variant):
        radius = rng.randint(60, 220)
        x, y = rng.randint(0, size), rng.randint(0, size)
        colour = rgb(hue + rng.randint(-25, 25), rng.uniform(0.45, 0.8), rng.uniform(0.7, 0.95))
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=(*colour, 90))
    draw.rounded_rectangle([90, 250, 710, 550], radius=36, fill=(255, 255, 255, 215))
    font = ImageFont.load_default(size=46)
    small = ImageFont.load_default(size=24)
    lines = wrap(draw, name, font, 560)[:3]
    y = 400 - len(lines) * 29
    ink = rgb(hue, 0.75, 0.32)
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((size - width) / 2, y), line, font=font, fill=ink)
        y += 58
    label = ["Front view", "Detail", "In use"][variant % 3]
    draw.text(((size - draw.textlength(label, font=small)) / 2, 505), label, font=small,
              fill=(*ink, 170))
    buffer = io.BytesIO()
    img.save(buffer, "JPEG", quality=85)
    return buffer.getvalue()


class Command(BaseCommand):
    help = "Seed demo events, products and accounts."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Delete existing products, events and orders first.")

    def handle(self, *args, **options):
        User = get_user_model()
        if options["reset"]:
            Order.objects.all().delete()
            for image in ProductImage.objects.all():
                image.delete()
            Product.objects.all().delete()
            Event.objects.all().delete()

        if not User.objects.filter(email=ADMIN_EMAIL).exists():
            User.objects.create_superuser(ADMIN_EMAIL, ADMIN_PASSWORD, full_name="Store Admin",
                                          phone="9000000001")
        if not User.objects.filter(email=CUSTOMER_EMAIL).exists():
            User.objects.create_user(CUSTOMER_EMAIL, CUSTOMER_PASSWORD, full_name="Demo Customer",
                                     phone="9000000002", address="12 MG Road",
                                     city="Kochi", pincode="682016")

        # A store with photos has been seeded (or stocked by an admin) already. A store
        # with products but no photos at all is a seed that failed part-way: finish it.
        if ProductImage.objects.exists():
            self.stdout.write("Store already has products; skipping (use --reset to rebuild).")
            return

        with transaction.atomic():
            events = {}
            for data in EVENTS:
                events[data["name"]], _ = Event.objects.get_or_create(name=data["name"],
                                                                      defaults=data)

            for name, category, price, mrp, stock, hue, tags, description in PRODUCTS:
                product, _ = Product.objects.get_or_create(name=name, defaults=dict(
                    category=category, price=price, mrp=mrp, stock=stock,
                    description=description))
                product.events.set([events[tag] for tag in tags])
                for variant in range(3):
                    image = ProductImage(product=product, sort_order=variant)
                    image.image.save(f"{product.slug}-{variant + 1}.jpg",
                                     ContentFile(make_photo(name, hue, variant)), save=True)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(PRODUCTS)} products and {len(EVENTS)} events.\n"
            f"Admin:    {ADMIN_EMAIL} / {ADMIN_PASSWORD}\n"
            f"Customer: {CUSTOMER_EMAIL} / {CUSTOMER_PASSWORD}"))
