import io
import tempfile
from unittest import mock

import cloudinary
from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings
from PIL import Image
from rest_framework.test import APITestCase

from accounts.models import User
from orders.models import Order
from orders.whatsapp import to_e164
from store.models import Event, Product
from store.storage import CloudinaryStorage

ADDRESS = {"full_name": "Asha", "phone": "98765 43210", "address": "1 Main St",
           "city": "Kochi", "pincode": "682001"}


def png_upload():
    buffer = io.BytesIO()
    Image.new("RGB", (40, 40), "red").save(buffer, "PNG")
    buffer.seek(0)
    buffer.name = "photo.png"
    return buffer


LOCAL_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


class CloudinaryStorageTests(SimpleTestCase):
    def test_upload_url_and_delete(self):
        storage = CloudinaryStorage()
        name = storage.get_available_name("products/Blue Mug.JPG")
        self.assertRegex(name, r"^shopfest/products/Blue Mug-[0-9a-f]{8}\.jpg$")
        with mock.patch("store.storage.cloudinary.uploader.upload") as upload:
            upload.return_value = {"public_id": "shopfest/products/mug-ab12cd34", "format": "jpg"}
            saved = storage._save("shopfest/products/mug-ab12cd34.jpg", ContentFile(b"img"))
        self.assertEqual(saved, "shopfest/products/mug-ab12cd34.jpg")
        self.assertEqual(upload.call_args.kwargs["public_id"], "shopfest/products/mug-ab12cd34")
        with mock.patch.dict("os.environ", {"CLOUDINARY_URL": "cloudinary://k:s@demo"}):
            cloudinary.reset_config()
            self.assertEqual(
                storage.url(saved),
                "https://res.cloudinary.com/demo/image/upload/v1/shopfest/products/mug-ab12cd34.jpg")
        cloudinary.reset_config()
        with mock.patch("store.storage.cloudinary.uploader.destroy") as destroy:
            storage.delete(saved)
        self.assertEqual(destroy.call_args.args[0], "shopfest/products/mug-ab12cd34")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(), TWILIO_ACCOUNT_SID="", TWILIO_AUTH_TOKEN="",
                   TWILIO_CONTENT_SID="", STORAGES=LOCAL_STORAGES)
class StoreFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("admin@x.com", "secret123")
        self.user = User.objects.create_user("user@x.com", "secret123")
        self.diwali = Event.objects.create(name="Diwali")
        self.xmas = Event.objects.create(name="Christmas")
        self.diya = Product.objects.create(name="Diya", price=100, stock=5)
        self.diya.events.add(self.diwali)
        self.tree = Product.objects.create(name="Tree", price=2000, stock=2)
        self.tree.events.add(self.xmas)
        self.mug = Product.objects.create(name="Mug", price=250, stock=10)

    def names(self, response):
        return sorted(p["name"] for p in response.data["products"])

    # ----- auth -----
    def test_register_login_and_profile(self):
        r = self.client.post("/api/auth/register/", {
            "email": "New@X.com", "password": "secret123", "full_name": "New", "phone": "9876543210"})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["user"]["email"], "new@x.com")
        r = self.client.post("/api/auth/login/", {"email": "new@x.com", "password": "secret123"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        r = self.client.patch("/api/auth/me/", {"city": "Kochi", "is_staff": True})
        self.assertEqual(r.data["city"], "Kochi")
        self.assertFalse(r.data["is_staff"])  # cannot self-promote
        bad = self.client.post("/api/auth/login/", {"email": "new@x.com", "password": "nope"})
        self.assertEqual(bad.status_code, 401)

    # ----- events drive the home page -----
    def test_storefront_follows_active_event(self):
        self.assertEqual(self.names(self.client.get("/api/storefront/")), ["Diya", "Mug", "Tree"])
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/admin/events/{self.diwali.id}/activate/")
        r = self.client.get("/api/storefront/")
        self.assertEqual(r.data["event"]["name"], "Diwali")
        self.assertEqual(self.names(r), ["Diya"])
        # Activating another event switches over; only one is ever active.
        self.client.post(f"/api/admin/events/{self.xmas.id}/activate/")
        self.assertEqual(self.names(self.client.get("/api/storefront/")), ["Tree"])
        self.assertEqual(Event.objects.filter(is_active=True).count(), 1)
        self.client.post("/api/admin/events/deactivate/")
        self.assertIsNone(self.client.get("/api/storefront/").data["event"])

    # ----- orders -----
    def test_place_order_generates_id_reduces_stock_and_logs_whatsapp(self):
        self.client.force_authenticate(self.user)
        r = self.client.post("/api/orders/", {**ADDRESS, "items": [
            {"product": self.diya.id, "quantity": 2}, {"product": self.mug.id, "quantity": 1}]},
            format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertRegex(r.data["order_id"], r"^ORD-\d{8}-[A-Z2-9]{6}$")
        self.assertEqual(r.data["total"], "450.00")
        self.assertEqual(r.data["whatsapp_status"], "logged")
        self.assertIn(r.data["order_id"], r.data["whatsapp_detail"])
        self.diya.refresh_from_db()
        self.assertEqual(self.diya.stock, 3)
        history = self.client.get("/api/orders/")
        self.assertEqual(len(history.data), 1)
        detail = self.client.get(f"/api/orders/{r.data['order_id']}/")
        self.assertEqual(len(detail.data["items"]), 2)

    def test_order_rejected_when_stock_is_short(self):
        self.client.force_authenticate(self.user)
        r = self.client.post("/api/orders/", {**ADDRESS, "items": [
            {"product": self.tree.id, "quantity": 3}]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.tree.refresh_from_db()
        self.assertEqual(self.tree.stock, 2)

    def test_orders_require_login_and_are_private(self):
        self.assertEqual(self.client.get("/api/orders/").status_code, 401)
        order = Order.objects.create(user=self.admin, **ADDRESS)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(f"/api/orders/{order.order_id}/").status_code, 404)

    @override_settings(TWILIO_ACCOUNT_SID="AC123", TWILIO_AUTH_TOKEN="token")
    def test_whatsapp_sent_through_twilio_when_configured(self):
        self.client.force_authenticate(self.user)
        with mock.patch("orders.whatsapp.requests.post") as post:
            post.return_value.ok = True
            r = self.client.post("/api/orders/", {**ADDRESS, "items": [
                {"product": self.mug.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.data["whatsapp_status"], "sent")
        sent = post.call_args.kwargs["data"]
        self.assertEqual(sent["To"], "whatsapp:+919876543210")
        self.assertIn(r.data["order_id"], sent["Body"])

    @override_settings(TWILIO_ACCOUNT_SID="AC123", TWILIO_AUTH_TOKEN="token",
                       TWILIO_CONTENT_SID="HX123")
    def test_whatsapp_uses_template_when_content_sid_is_set(self):
        self.client.force_authenticate(self.user)
        with mock.patch("orders.whatsapp.requests.post") as post:
            post.return_value.ok = True
            r = self.client.post("/api/orders/", {**ADDRESS, "items": [
                {"product": self.mug.id, "quantity": 1}]}, format="json")
        sent = post.call_args.kwargs["data"]
        self.assertEqual(sent["ContentSid"], "HX123")
        self.assertIn(r.data["order_id"], sent["ContentVariables"])
        self.assertNotIn("Body", sent)

    @override_settings(TWILIO_ACCOUNT_SID="AC123", TWILIO_AUTH_TOKEN="token")
    def test_whatsapp_failure_does_not_lose_the_order(self):
        self.client.force_authenticate(self.user)
        with mock.patch("orders.whatsapp.requests.post") as post:
            post.return_value.ok = False
            post.return_value.status_code = 400
            post.return_value.json.return_value = {"message": "not in sandbox"}
            r = self.client.post("/api/orders/", {**ADDRESS, "items": [
                {"product": self.mug.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["whatsapp_status"], "failed")

    def test_phone_normalisation(self):
        self.assertEqual(to_e164("98765 43210"), "+919876543210")
        self.assertEqual(to_e164("09876543210"), "+919876543210")
        self.assertEqual(to_e164("+1 415-523-8886"), "+14155238886")

    # ----- admin -----
    def test_admin_endpoints_are_admin_only(self):
        self.client.force_authenticate(self.user)
        for url in ["/api/admin/products/", "/api/admin/users/", "/api/admin/events/",
                    "/api/admin/orders/", "/api/admin/stats/"]:
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_admin_product_crud_with_images_and_event_tags(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/admin/products/", {
            "name": "Lantern", "price": "499.00", "stock": 7,
            "event_ids": [self.diwali.id, self.xmas.id]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data["id"]
        self.assertEqual(len(r.data["events"]), 2)
        img = self.client.post(f"/api/admin/products/{pid}/images/", {"image": png_upload()},
                               format="multipart")
        self.assertEqual(img.status_code, 201, img.data)
        public = self.client.get(f"/api/products/{r.data['slug']}/")
        self.assertEqual(len(public.data["images"]), 1)
        self.assertEqual(self.client.delete(f"/api/admin/images/{img.data['id']}/").status_code, 204)
        r = self.client.patch(f"/api/admin/products/{pid}/", {"price": "450.00", "event_ids": []},
                              format="json")
        self.assertEqual(r.data["events"], [])
        self.assertEqual(self.client.delete(f"/api/admin/products/{pid}/").status_code, 204)

    def test_admin_user_crud(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/admin/users/", {"email": "staff@x.com", "password": "secret123",
                                                   "full_name": "Staff", "is_staff": True})
        self.assertEqual(r.status_code, 201, r.data)
        uid = r.data["id"]
        self.assertTrue(User.objects.get(pk=uid).check_password("secret123"))
        r = self.client.patch(f"/api/admin/users/{uid}/", {"is_active": False})
        self.assertFalse(r.data["is_active"])
        self.assertEqual(self.client.delete(f"/api/admin/users/{uid}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/admin/users/{self.admin.id}/").status_code, 400)

    def test_admin_updates_order_status(self):
        order = Order.objects.create(user=self.user, **ADDRESS)
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f"/api/admin/orders/{order.id}/", {"status": "shipped", "total": "1"})
        self.assertEqual(r.data["status"], "shipped")
        self.assertEqual(r.data["total"], "0.00")
