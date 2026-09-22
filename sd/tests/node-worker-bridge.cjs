// Test adapter: run the unmodified browser worker with local, identical Pyodide assets.
const {parentPort,workerData}=require('node:worker_threads');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const {fileURLToPath}=require('node:url');
const {loadPyodide}=require(path.join(process.env.PYODIDE_HOME,'pyodide.js'));
global.self=global;global.location={href:workerData.url};
global.importScripts=()=>{global.loadPyodide=opts=>loadPyodide({...opts,indexURL:process.env.PYODIDE_HOME});};
global.fetch=async url=>new Response(fs.readFileSync(fileURLToPath(url)));
global.postMessage=data=>parentPort.postMessage(data);
parentPort.on('message',data=>global.onmessage({data}));
vm.runInThisContext(fs.readFileSync(fileURLToPath(workerData.url),'utf8'),{filename:workerData.url});
