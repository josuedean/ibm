/* Each instance owns a distinct Python interpreter and random generator. */
const BASE='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let py;
(async()=>{try{
 postMessage({stage:'Downloading Python runtime (Pyodide 0.27.7)…'});
 importScripts(BASE+'pyodide.js');
 py=await loadPyodide({indexURL:BASE,stdout:()=>{},stderr:()=>{}});
 postMessage({stage:'Preparing strategy validator…'});
 const response=await fetch(new URL('../runner.py',self.location.href));
 if(!response.ok)throw Error('Cannot load runner.py: '+response.status);
 py.runPython(await response.text());
 postMessage({ready:true});
}catch(error){postMessage({fatal:'Python runtime could not load. Check your internet connection and access to cdn.jsdelivr.net, then retry. '+error.message});}})();
onmessage=({data})=>{try{py.globals.set('_request_json',JSON.stringify(data));const result=JSON.parse(py.runPython('handle(_request_json)'));postMessage({id:data.id,...result});}catch(error){postMessage({id:data.id,error:error.message});}};
