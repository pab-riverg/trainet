import shutil
import tempfile

from django.test import override_settings
from django.test.runner import DiscoverRunner


class RunnerConMediaTemporal(DiscoverRunner):
    """Ejecuta TODAS las pruebas con un MEDIA_ROOT temporal: ninguna escribe en backend/media/ real."""

    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        self._media_temporal = tempfile.mkdtemp(prefix='trainet_media_pruebas_')
        self._override_media = override_settings(MEDIA_ROOT=self._media_temporal)
        self._override_media.enable()

    def teardown_test_environment(self, **kwargs):
        self._override_media.disable()
        shutil.rmtree(self._media_temporal, ignore_errors=True)
        super().teardown_test_environment(**kwargs)
