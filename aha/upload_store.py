"""Bounded, temporary chunk assembly. Original audio remains on the client."""
import tempfile
import time
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException

CHUNK_BYTES = 512 * 1024
MAX_BYTES = 64_000_000

class UploadStore:
    def __init__(self, root=None):
        self.root = Path(root or tempfile.mkdtemp(prefix='aha-uploads-'))
        self.root.mkdir(parents=True, exist_ok=True)
        self.items = {}

    def put(self, identifier, index, total, data):
        try:
            identifier = str(UUID(identifier))
        except ValueError:
            raise HTTPException(400, '无效上传标识。')
        if not 44 < total <= MAX_BYTES or index < 0 or index * CHUNK_BYTES >= total:
            raise HTTPException(400, '上传大小或分块序号无效。')
        expected = min(CHUNK_BYTES, total - index * CHUNK_BYTES)
        if len(data) != expected:
            raise HTTPException(400, '音频分块不完整，请重试。')
        now = time.monotonic()
        for key, item in list(self.items.items()):
            if not item['busy'] and now - item['touched'] > 3600:
                self.remove(key)
        item = self.items.get(identifier)
        if item is None:
            if index != 0:
                raise HTTPException(410, '临时上传已过期，请重新上传本地录音。')
            if len(self.items) >= 4 or sum(x['total'] for x in self.items.values()) + total > 96_000_000:
                raise HTTPException(429, '其他音频正在上传，请稍后重试。')
            path = self.root / identifier
            path.touch()
            item = self.items[identifier] = dict(path=path, total=total, received=0, touched=now, busy=False)
        if item['busy'] or item['total'] != total:
            raise HTTPException(409, '上传正在处理或大小不一致，请稍后重试。')
        offset = index * CHUNK_BYTES
        if offset < item['received']:
            with item['path'].open('rb') as source:
                source.seek(offset)
                if source.read(len(data)) != data:
                    raise HTTPException(409, '重复分块内容不一致。')
        elif offset == item['received']:
            with item['path'].open('ab') as output:
                output.write(data)
            item['received'] += len(data)
        else:
            raise HTTPException(409, '缺少前面的音频分块，请重试。')
        item['touched'] = now
        return {'received': item['received'], 'total': total}

    def ready(self, identifier):
        item = self.items.get(identifier)
        if item is None:
            raise HTTPException(410, '临时上传已过期，请重新上传本地录音。')
        if item['busy'] or item['received'] != item['total']:
            raise HTTPException(409, '上传尚未完整或已经开始处理。')
        item['busy'] = True
        return item['path']

    def remove(self, identifier):
        item = self.items.pop(identifier, None)
        if item:
            item['path'].unlink(missing_ok=True)
