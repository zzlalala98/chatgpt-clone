import asyncio
import io
import sys
import tempfile
import unittest
import uuid
import wave
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from fastapi import HTTPException
from fastapi.testclient import TestClient
from upload_store import UploadStore, CHUNK_BYTES

class UploadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = UploadStore(self.tmp.name)
        self.id = str(uuid.uuid4())
    def tearDown(self):
        self.tmp.cleanup()
    def test_order_retry_integrity_and_cleanup(self):
        data = bytes(range(256)) * 5000
        self.store.put(self.id, 0, len(data), data[:CHUNK_BYTES])
        self.store.put(self.id, 0, len(data), data[:CHUNK_BYTES])
        with self.assertRaises(HTTPException):
            self.store.put(self.id, 2, len(data), data[2*CHUNK_BYTES:])
        with self.assertRaises(HTTPException):
            self.store.put(self.id, 0, len(data), b'x'*CHUNK_BYTES)
        for i in [1, 2]:
            self.store.put(self.id, i, len(data), data[i*CHUNK_BYTES:(i+1)*CHUNK_BYTES])
        self.assertEqual(self.store.ready(self.id).read_bytes(), data)
        self.store.remove(self.id)
        self.assertFalse(list(Path(self.tmp.name).iterdir()))
    def test_invalid_and_expired_upload(self):
        with self.assertRaises(HTTPException):self.store.put('../bad', 0, 50, b'x'*50)
        with self.assertRaises(HTTPException):self.store.put(self.id, 1, 600000, b'x'*(600000-CHUNK_BYTES))
        with self.assertRaises(HTTPException):self.store.put(self.id, 0, 50, b'x'*49)
        with self.assertRaises(HTTPException):self.store.ready(self.id)
    def test_http_12mb_recording_assembled_without_loss(self):
        buf=io.BytesIO()
        with wave.open(buf,'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(b'\x01\x00'*48000*128)
        audio=buf.getvalue()
        async def fake_pipeline(data,token):
            self.assertEqual(data,audio)
            return dict(transcript='test',note='test note',warning='')
        with patch.object(server,'uploads',self.store), patch.object(server,'pipeline',fake_pipeline), patch.object(server.os,'getenv',return_value='test'), patch.object(server.hmac,'compare_digest',return_value=True):
            with TestClient(server.app) as c:
                for index,offset in enumerate(range(0,len(audio),CHUNK_BYTES)):
                    r=c.put(f'/api/uploads/{self.id}/chunks/{index}?total_bytes={len(audio)}',content=audio[offset:offset+CHUNK_BYTES])
                    self.assertEqual(r.status_code,200,r.text)
                r=c.post(f'/api/uploads/{self.id}/complete')
                self.assertEqual(r.status_code,200,r.text)
                self.assertEqual(r.json()['duration'],128)
                self.assertFalse(self.store.items)

if __name__=='__main__':unittest.main()
