from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
from PIL import Image
import json,re,hashlib,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];errors=[];checks=0
def ref(v,base):
 global checks
 if not v or v.startswith(('#','https:','http:','tel:','mailto:','data:')):return
 p=(base/unquote(urlsplit(v).path)).resolve();checks+=1
 if not p.is_file():errors.append(str(p))
class Parser(HTMLParser):
 def __init__(self,base):super().__init__();self.base=base;self.ids=set();self.anchors=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k=='id':self.ids.add(v)
   if k in ['src','href']:
    ref(v,self.base)
    if v and v.startswith('#'):self.anchors.append(v[1:])
for f in R.rglob('*.html'):
 p=Parser(f.parent);p.feed(f.read_text());assert all(a in p.ids for a in p.anchors),(f,p.anchors)
for f in R.rglob('*.css'):
 for v in re.findall(r'url\([\x27\"]?([^\x27\"\)]+)',f.read_text()):ref(v,f.parent)
for f in R.rglob('*.json'):json.loads(f.read_text())
svg=(R/'01-identidade/animalia-logo-transparente.svg').read_text();ET.fromstring(svg);assert '<image' not in svg and 'base64' not in svg and '<rect' not in svg
for f in [R/'01-identidade/animalia-logo-transparente.png',*list((R/'05-camadas').glob('*.png'))]:
 im=Image.open(f);assert im.mode=='RGBA';lo,hi=im.getchannel('A').getextrema();assert lo==0 and hi>=250,(f,lo,hi)
prov=json.loads((R/'07-integracao/proveniencia.json').read_text())
for p in prov['originals']:assert hashlib.sha256((R/p['path']).read_bytes()).hexdigest()==p['sha256']
if (R/'MANIFESTO-SHA256.json').exists():
 for p,h in json.loads((R/'MANIFESTO-SHA256.json').read_text()).items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==h,p
assert not errors,errors
print(f'PASS: {checks} local references, anchors, JSON, alpha, vector-only SVG, original image hashes, manifest if present.')
