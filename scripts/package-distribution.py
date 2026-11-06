from pathlib import Path
import shutil,json,hashlib,zipfile,argparse
parser=argparse.ArgumentParser(description='Package the final HV Network Windows and static-web distributions.')
parser.add_argument('--runtime',type=Path,default=Path('C:/Users/f676001/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'),help='Windows x64 node.exe from the official Node.js v24.19.0 distribution')
parser.add_argument('--runtime-license',type=Path,default=Path('tmp/node-v24.19.0-LICENSE.txt'),help='LICENSE from the same official Node.js distribution')
args=parser.parse_args()
if not args.runtime.is_file() or not args.runtime_license.is_file():parser.error('Provide --runtime and --runtime-license from the official Node.js Windows x64 distribution.')
root=Path(__file__).resolve().parent.parent
out=root/'output';out.mkdir(exist_ok=True)
revision=json.loads((root/'src/models/site/reviewed-layout.json').read_text(encoding='utf-8'))['layoutRevision']
assert revision=='authored-2026-11-06.9'
name='HV-Network-2026-11-06-r9'
portable=out/(name+'-Windows');web=out/(name+'-Web')
for folder in [portable,web]:folder.mkdir(exist_ok=True)
shutil.copytree(root/'dist',portable/'app',dirs_exist_ok=True);shutil.copytree(root/'dist',web/'site',dirs_exist_ok=True)
(portable/'runtime').mkdir(exist_ok=True)
runtime=args.runtime
runtime_copy=portable/'runtime/node.exe'
if not runtime_copy.exists() or hashlib.sha256(runtime.read_bytes()).digest()!=hashlib.sha256(runtime_copy.read_bytes()).digest():shutil.copy2(runtime,runtime_copy)
shutil.copy2(args.runtime_license,portable/'runtime/LICENSE.txt')
shutil.copy2(root/'scripts/portable-server.mjs',portable/'server.mjs')
(portable/'START-HV-NETWORK.cmd').write_text('@echo off\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" "%~dp0server.mjs" --open\r\nif errorlevel 1 pause\r\n',encoding='ascii')
readme="""HV NETWORK — FINAL OWNER UPDATE, 6 NOVEMBER 2026
Layout: authored-2026-11-06.9 | Model: construction-2026-11-06.12

WINDOWS PORTABLE COPY
1. Extract the entire ZIP to a folder. Do not run it from inside the ZIP.
2. Double-click START-HV-NETWORK.cmd.
3. The browser opens at the address printed in the window. Keep that window open.
   If it does not open automatically, copy that address into Chrome or Edge.
4. Close the window or press Ctrl+C to stop.
No installation, admin rights, internet connection or supplied PDFs are required.
The bundled runtime is Node.js v24.19.0, Windows x64.
If company controls block the launcher/runtime, use an IT-approved internal web host.
If port 8765 is in use, the launcher tries the next port automatically (up to 100 ports).
Use the address printed in its window. Browser-only edits belong to that address;
the final built-in layout is available on every port.

DEFAULT AND SAVING
The final owner layout is built into this copy. New browsers open that layout.
Switching starts from the agreed model baseline on each opening.
Editing is locked; get the password from the owner. Finish Editing locks it again.
Layout edits save only in that browser on this computer. Download Review to retain
or return changes to the owner; they do not automatically update other copies.
Save Scenario stores simulation states separately; reopening the tool resets states.
Use a new release folder when updating; do not mix files from different releases.

SCOPE
Educational connectivity model. No electrical calculations or live site status.
The editing password is a local UI lock, not secure server authentication.
This archive contains the site network data. Share only with intended recipients.
No PDF source drawings are included.

WEB HOSTING
The separate Web ZIP contains site/; publish its contents to an approved static host.
Use HTTPS for hosted access. No backend, database or external API is required.
Hosted access control, if required, must be configured by the hosting administrator.
Do not publish publicly unless the owner has authorised release of the site data.
"""
(portable/'READ-ME.txt').write_text(readme,encoding='utf-8');(web/'READ-ME.txt').write_text(readme,encoding='utf-8')
for folder in [portable,web]:
 notices=folder/'licenses';notices.mkdir(exist_ok=True)
 for package in ['react','react-dom','scheduler','zod']:
  source=root/'node_modules'/package/'LICENSE'
  if not source.exists() and package=='scheduler':
   candidates=list((root/'node_modules/.pnpm').glob('scheduler@*/node_modules/scheduler/LICENSE'));source=candidates[0] if candidates else source
  if source.exists():shutil.copy2(source,notices/(package+'-LICENSE.txt'))
  else:raise RuntimeError('Missing license '+package)
 manifest={'layoutRevision':revision,'modelVersion':'construction-2026-11-06.12','files':{}}
 for f in sorted(folder.rglob('*')):
  if f.is_file() and f.name!='manifest.json':manifest['files'][str(f.relative_to(folder)).replace('\\','/')]=hashlib.sha256(f.read_bytes()).hexdigest()
 (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 archive=out/(folder.name+'.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for f in folder.rglob('*'):
   if f.is_file():z.write(f,f.relative_to(out))
 print(str(archive),archive.stat().st_size)
