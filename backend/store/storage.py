"""Keeps uploaded photos on Cloudinary instead of the local disk.

Used automatically when CLOUDINARY_URL is set (see settings.py). Free container hosts
wipe their disk on every restart, so hosted photos have to live somewhere else.
"""
import io
import posixpath
import secrets

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

FOLDER = "shopfest"


@deconstructible
class CloudinaryStorage(Storage):
    def _public_id(self, name):
        """'shopfest/products/diya-1.jpg' -> 'shopfest/products/diya-1'"""
        return posixpath.splitext(name)[0]

    def get_available_name(self, name, max_length=None):
        # A short random suffix keeps names unique without asking Cloudinary first.
        root, ext = posixpath.splitext(name.replace("\\", "/"))
        return f"{FOLDER}/{root}-{secrets.token_hex(4)}{ext.lower() or '.jpg'}"

    def _save(self, name, content):
        content.seek(0)
        result = cloudinary.uploader.upload(
            io.BytesIO(content.read()), public_id=self._public_id(name),
            resource_type="image", overwrite=True)
        return f"{result['public_id']}.{result['format']}"

    def url(self, name):
        return cloudinary.utils.cloudinary_url(name, secure=True)[0]

    def delete(self, name):
        if name:
            cloudinary.uploader.destroy(self._public_id(name), invalidate=True)

    def exists(self, name):
        return False

    def size(self, name):
        return 0
