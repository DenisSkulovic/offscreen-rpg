/**
 * Read-only retirement review for work/designs/open and work/changes/archive.
 * Age never authorizes deletion. Normal use: pnpm repo:retirement [--json].
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './process.mjs';

function git(args) {
  try { return execFileSync('git', args, { cwd:root, encoding:'utf8',
    stdio:['ignore','pipe','ignore'] }).trim(); }
  catch { return null; }
}
function walk(dir) {
  if (!existsSync(dir)) return [];
  const files=[];
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    if (entry.isDirectory() && ['node_modules','.git','dist','.next'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}
function rel(full) {return path.relative(root,full).replaceAll('\\','/');}
function ageDays(folder,now) {
  const iso=git(['log','-1','--format=%cI','--',rel(folder)]);
  const time=iso?Date.parse(iso):NaN;
  return Number.isFinite(time)?Math.max(0,Math.floor((now.getTime()-time)/86400000)):null;
}
function markdownLinks() {
  const tracked=git(['ls-files','-z']);
  const files=tracked!==null?tracked.split('\0').filter(Boolean):
    ['docs','work','.agents','scripts'].flatMap(x=>walk(path.join(root,x)).map(rel));
  const out=[];
  const pattern=/!?\[[^\]]*]\(([^)\s]+)\)/g;
  for (const file of files) {
    if (!file.endsWith('.md'))continue;
    const full=path.join(root,file);if(!existsSync(full))continue;
    for (const match of readFileSync(full,'utf8').matchAll(pattern)) {
      const url=match[1].split('#')[0];
      if (!url || url.startsWith('/') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url))continue;
      let dest;try{dest=decodeURIComponent(url);}catch{continue;}
      out.push({from:file,to:rel(path.resolve(path.dirname(full),dest))});
    }
  }
  return out;
}
function inbound(links,folder) {
  return links.filter(x=>(x.to===folder||x.to.startsWith(folder+'/'))&&
    x.from!==folder&&!x.from.startsWith(folder+'/')).length;
}
function status(dir) {
  const readme=path.join(dir,'README.md');
  const file=existsSync(readme)?readme:walk(dir).find(x=>x.endsWith('.md'));
  if(!file)return '(no Markdown)';
  const s=readFileSync(file,'utf8').slice(0,1500);
  const m=s.match(/\*\*(?:State|Status):?\*\*\s*:?\s*([^\n]+)/i) ||
          s.match(/\*\*(?:State|Status):\s*([^*]+)\*\*/i);
  return m?m[1].replace(/\s+/g,' ').slice(0,120):'(unspecified)';
}
function bytes(files) {return files.reduce((sum,file)=>sum+statSync(file).size,0);}
export function assessDesign(state,days,backlinks,graceDays=7) {
  return {
    review:/\b(done|completed|dormant|historical|cancelled|canceled|superseded)\b/i.test(state)
      ||(days!==null&&days>=graceDays),
    backlinks,
    autoDelete:false
  };
}
export function assessArchive(days,ledger,backlinks,graceDays=7) {
  return {review:days!==null&&days>=graceDays,
    pruneCandidate:days!==null&&days>=graceDays&&ledger&&backlinks===0,
    autoDelete:false};
}
export function inspect(now=new Date(),graceDays=7) {
  const links=markdownLinks();
  const base=path.join(root,'work/designs/open');
  const dirs=existsSync(base)?readdirSync(base,{withFileTypes:true})
    .filter(x=>x.isDirectory()).map(x=>path.join(base,x.name)).sort():[];
  const designs=dirs.map(dir=>{
    const files=walk(dir),name=rel(dir),days=ageDays(dir,now),state=status(dir);
    return {name,files:files.length,bytes:bytes(files),lastChangeAgeDays:days,
      state,...assessDesign(state,days,inbound(links,name),graceDays)};
  });
  const archive=path.join(root,'work/changes/archive');
  const changeDirs=walk(archive).filter(x=>path.basename(x)==='CHANGE.md')
    .map(x=>path.dirname(x)).sort();
  const changes=changeDirs.map(dir=>{
    const files=walk(dir),name=rel(dir),leaf=path.basename(dir),days=ageDays(dir,now);
    const ledger=path.join(root,'work/changes/ledger',leaf.slice(0,7)+'.md');
    const hasLedger=existsSync(ledger)&&readFileSync(ledger,'utf8').includes(leaf);
    return {name,files:files.length,bytes:bytes(files),lastChangeAgeDays:days,
      hasLedger,...assessArchive(days,hasLedger,inbound(links,name),graceDays)};
  });
  return {
    schema:'offscreen.work-retirement.v1',graceDays,automaticDeletion:false,
    designs:{total:designs.length,files:designs.reduce((a,x)=>a+x.files,0),
      bytes:designs.reduce((a,x)=>a+x.bytes,0),review:designs.filter(x=>x.review)},
    changeArchive:{total:changes.length,files:changes.reduce((a,x)=>a+x.files,0),
      bytes:changes.reduce((a,x)=>a+x.bytes,0),review:changes.filter(x=>x.review),
      pruneCandidates:changes.filter(x=>x.pruneCandidate)}
  };
}
const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self){
  const args=process.argv.slice(2),idx=args.indexOf('--age-days');
  const graceDays=idx<0?7:Number(args[idx+1]);
  if(!Number.isInteger(graceDays)||graceDays<1){
    console.error('Use a positive integer with --age-days');process.exitCode=2;
  }else{
    const r=inspect(new Date(),graceDays);
    if(args.includes('--json')) console.log(JSON.stringify(r,null,2));
    else{
      console.log('Read-only work-retirement review; no automatic deletion');
      console.log('Designs: '+r.designs.total+' folders, '+r.designs.files+' files, '+r.designs.bytes+' bytes; review '+r.designs.review.length);
      for(const x of r.designs.review)console.log('  '+x.name+' | '+String(x.lastChangeAgeDays??'?')+'d | '+x.backlinks+' inbound | '+x.state);
      console.log('Change archive: '+r.changeArchive.total+' packets, '+r.changeArchive.files+' files, '+r.changeArchive.bytes+' bytes');
      console.log('Aged review: '+r.changeArchive.review.length+'; ledger+link-clean pruning candidates: '+r.changeArchive.pruneCandidates.length);
      console.log('Before any git rm: preserve unique evidence, add full-SHA ledger recovery, fix links and confirm owner disposition.');
    }
  }
}
