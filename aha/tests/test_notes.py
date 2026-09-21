import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
import server
from fastapi.testclient import TestClient

class NoteTests(unittest.IsolatedAsyncioTestCase):
    async def test_default_note_never_invokes_research_agent(self):
        calls=[]
        def handle(request):
            if request.url.path.endswith('/audio/transcriptions'):
                return httpx.Response(200,json={'text':'这是 Capture 之前说的话，这是之后说的话。'})
            body=json.loads(request.content);calls.append(body)
            return httpx.Response(200,json={'choices':[{'message':{'content':'标题：录音测试\n内容：用于检查捕捉前后的音频。'}}]})
        client=httpx.AsyncClient(transport=httpx.MockTransport(handle))
        with patch.object(server.httpx,'AsyncClient',return_value=client):
            result=await server.pipeline(b'fake','test')
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0]['model'],'deepseek')
        self.assertEqual(calls[0]['tools'],[])
        self.assertEqual(calls[0]['tool_choice'],'none')
        self.assertIn('不搜索',calls[0]['messages'][0]['content'])
        self.assertIn('Capture',result['transcript'])
        self.assertEqual(result['warning'],'')
    async def test_research_is_separate_request(self):
        calls=[]
        def handle(request):
            calls.append(json.loads(request.content))
            return httpx.Response(200,json={'choices':[{'message':{'content':'独立研究结果'}}]})
        client=httpx.AsyncClient(transport=httpx.MockTransport(handle))
        with patch.object(server.httpx,'AsyncClient',return_value=client),patch.object(server.os,'getenv',return_value='test'):
            result=await server.research(server.ResearchInput(transcript='如何优化语音采集？'))
        self.assertEqual(result,{'research':'独立研究结果'})
        self.assertEqual(calls[0]['model'],'supermind-agent-v1')
        self.assertNotIn('note',result)
