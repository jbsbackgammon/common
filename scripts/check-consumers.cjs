'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root,'data/brand.json'),'utf8'));
const window = {};
const context = {window, URL, AbortController, setTimeout, clearTimeout, document:{currentScript:{src:'https://jbsbackgammon.github.io/common/brand.js'}},fetch:async()=>({ok:true,json:async()=>data})};
vm.runInNewContext(fs.readFileSync(path.join(root,'brand.js'),'utf8'),context);
(async()=>{
 await window.JBSBrand.load();
 const clients = process.argv.slice(2);
 for(const client of clients){
   const source=fs.readFileSync(path.join(client,'index.html'),'utf8');
   for(const file of ['ui.css','brand.js','members.js','naming.js','ui.js']){
     assert.ok(source.includes('/common/'+file),client+' missing '+file);
     assert.ok(fs.existsSync(path.join(root,file)),file+' not published');
   }
   const js=client.endsWith('overlay')?fs.readFileSync(path.join(client,'overlay.js'),'utf8'):source;
   for(const method of ['getMatchRounds','getTextColor','splitMatchRound']) assert.ok(typeof window.JBSBrand[method]==='function' && js.includes(method),client+' contract '+method);
   for(const t of data.tournaments) assert.ok(window.JBSBrand.getMatchRounds(t.id).length>0,t.id);
 }
 console.log('Cross-repository shared API and master contracts passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
