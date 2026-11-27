"""Research-only synthetic comparison. No app dependencies, storage, network or database.
Static path-ordered immutable toy index supports existing-key revisions ONLY.
Not a correct production B+ tree (no insertion, delete or balancing).
"""
import json, uuid, hashlib, time, bisect

def canon(obj): return (json.dumps(obj,sort_keys=True,separators=(',',':'))+'\n').encode()
def digest(buf): return hashlib.sha256(buf).hexdigest()
def entry(i):
    return {'documentId':str(uuid.uuid5(uuid.NAMESPACE_DNS,'d-'+str(i))),
            'revision':1,'path':f'world/people/char-{i:06d}.md',
            'objectHash':digest(str(i).encode()),'kind':'identity',
            'authority':'canon','visibility':'player-known'}

def build(entries,fanout=32):
    store={}; level=[]
    for j in range(0,len(entries),fanout):
        page=entries[j:j+fanout]; blob=canon({'type':'leaf','entries':page})
        h=digest(blob);store[h]=blob;level.append((page[0]['path'],h))
    height=1
    while len(level)>1:
        upper=[]
        for j in range(0,len(level),fanout):
            children=level[j:j+fanout]
            node={'type':'index','children':[{'key':k,'hash':h} for k,h in children]}
            blob=canon(node);h=digest(blob);store[h]=blob
            upper.append((children[0][0],h))
        level=upper;height+=1
    return store,level[0][1],height

def replace_existing(store,root,key,new_entry):
    path=[];h=root
    while True:
        node=json.loads(store[h]);path.append([node,None])
        if node['type']=='leaf':break
        keys=[c['key'] for c in node['children']]
        pos=max(0,bisect.bisect_right(keys,key)-1)
        path[-1][1]=pos;h=node['children'][pos]['hash']
    node=path[-1][0];keys=[e['path'] for e in node['entries']]
    i=bisect.bisect_left(keys,key)
    assert i<len(keys) and keys[i]==key
    node['entries'][i]=new_entry
    count=0;total=0
    for node,pos in reversed(path):
        if pos is not None:node['children'][pos]['hash']=h
        blob=canon(node);h=digest(blob)
        if h not in store:store[h]=blob;count+=1;total+=len(blob)
    return h,count,total

for n in [100,1000,4000,10000]:
    originals=[entry(i) for i in range(n)]
    sid=str(uuid.uuid4())
    flat={'format':'offscreen.manifest.v1','campaignId':sid,'revision':1000,
          'previousRootHash':'0'*64,'authorOperationId':sid,'entries':originals}
    single=len(canon(flat));flat_bytes=0
    entries=originals.copy()
    for j in range(100):
        ix=(j*137+17)%n
        changed=dict(entries[ix]);changed['revision']+=j+1
        changed['objectHash']=digest(f'content-{ix}-{j}'.encode())
        entries[ix]=changed;flat['entries']=entries;flat['revision']+=1
        flat_bytes+=len(canon(flat))
    entries=originals.copy();store,root,height=build(entries)
    initial=sum(len(data) for data in store.values());tree_bytes=0;nodes=0
    for j in range(100):
        ix=(j*137+17)%n
        changed=dict(entries[ix]);changed['revision']+=j+1
        changed['objectHash']=digest(f'content-{ix}-{j}'.encode())
        entries[ix]=changed
        root,cnt,added=replace_existing(store,root,changed['path'],changed)
        nodes+=cnt;tree_bytes+=added
    print(json.dumps({'docs':n,'height':height,'v1_manifest_bytes':single,
      'v1_over_1MiB':single>1048576,'initial_tree_metadata_bytes':initial,
      '100_edits_v1_metadata_bytes':flat_bytes,
      '100_edits_tree_metadata_bytes':tree_bytes,
      '100_edits_tree_new_nodes':nodes,
      'metadata_reduction_x':round(flat_bytes/tree_bytes,1)}))
