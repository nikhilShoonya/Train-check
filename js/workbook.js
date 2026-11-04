/* Minimal OOXML table import/export. No macros, formulas or external links are executed. */
(() => {
  'use strict';
  const W=TC.workbook={},encoder=new TextEncoder(),decoder=new TextDecoder();
  const xml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const col=index=>{let value='';for(let n=index+1;n;n=Math.floor((n-1)/26))value=String.fromCharCode(65+(n-1)%26)+value;return value;};
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  W.zip=files=>{
    const local=[],central=[];let offset=0;
    for(const [name,content] of Object.entries(files)){
      const n=encoder.encode(name),data=typeof content==='string'?encoder.encode(content):content,checksum=crc(data);
      const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);h.set(n,30);local.push(h,data);
      const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);central.push(c);offset+=h.length+data.length;
    }
    const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
    const result=new Uint8Array(offset+size+22);let position=0;for(const bytes of [...local,...central,end]){result.set(bytes,position);position+=bytes.length;}return result;
  };
  W.write=rows=>{
    const worksheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="30" width="24" customWidth="1"/></cols><sheetData>${rows.map((row,i)=>`<row r="${i+1}">${row.map((value,j)=>typeof value==='number'&&Number.isFinite(value)?`<c r="${col(j)}${i+1}"><v>${value}</v></c>`:`<c r="${col(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    return W.zip({'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="TrainCheck" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':worksheet});
  };
  W.unzip=async input=>{
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length>1048576)throw Error('Workbook exceeds the 1 MB demo limit.');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}if(end<0)throw Error('Not a valid XLSX ZIP workbook.');
    const count=v.getUint16(end+10,true);if(count>200)throw Error('Workbook contains too many parts.');let position=v.getUint32(end+16,true),total=0;const files={};
    for(let i=0;i<count;i++){
      if(position+46>bytes.length||v.getUint32(position,true)!==0x02014b50)throw Error('Malformed workbook directory.');
      const flags=v.getUint16(position+8,true),method=v.getUint16(position+10,true),packed=v.getUint32(position+20,true),size=v.getUint32(position+24,true),n=v.getUint16(position+28,true),extra=v.getUint16(position+30,true),comment=v.getUint16(position+32,true),offset=v.getUint32(position+42,true),name=decoder.decode(bytes.slice(position+46,position+46+n));
      if(flags&1)throw Error('Encrypted workbooks are unsupported.');if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw Error('Unsafe workbook part path.');if(/vbaProject|externalLinks/i.test(name))throw Error('Use a workbook without macros or external links.');
      total+=size;if(total>5*1024*1024||size>2*1024*1024)throw Error('Expanded workbook exceeds the demo safety limit.');
      if(offset+30>bytes.length||v.getUint32(offset,true)!==0x04034b50)throw Error('Invalid workbook entry.');if(decoder.decode(bytes.slice(offset+30,offset+30+v.getUint16(offset+26,true)))!==name)throw Error('Workbook entry name mismatch.');const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);if(start+packed>bytes.length)throw Error('Truncated workbook entry.');
      const payload=bytes.slice(start,start+packed);let data;
      if(method===0)data=payload;
      else if(method===8){if(typeof DecompressionStream==='undefined')throw Error('This browser cannot read compressed XLSX. Save the worksheet as CSV instead.');let stream;try{stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{throw Error('Compressed XLSX is unsupported in this browser. Use CSV instead.');}const reader=stream.getReader(),chunks=[];let expanded=0;while(true){const {done,value}=await reader.read();if(done)break;expanded+=value.length;if(expanded>size||expanded>2*1024*1024){await reader.cancel();throw Error('Expanded workbook entry exceeds its declared size.');}chunks.push(value);}data=new Uint8Array(expanded);let at=0;for(const c of chunks){data.set(c,at);at+=c.length;}}
      else throw Error('Unsupported workbook compression. Use CSV instead.');
      if(data.length!==size||crc(data)!==v.getUint32(position+16,true))throw Error('Workbook checksum or size mismatch.');files[name]=decoder.decode(data);position+=46+n+extra+comment;
    }
    return files;
  };
  W.read=async bytes=>{
    const tags=(node,name)=>Array.from(node.getElementsByTagName('*')).filter(el=>(el.localName||el.nodeName?.split(':').at(-1))===name);
    const files=await W.unzip(bytes),parse=source=>{if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('XML entities are not supported.');const doc=new DOMParser().parseFromString(source,'application/xml');if(tags(doc,'parsererror').length)throw Error('Malformed workbook XML.');return doc;};
    if(!files['xl/workbook.xml'])throw Error('The file is not an XLSX workbook.');
    const workbook=parse(files['xl/workbook.xml']),sheet=tags(workbook,'sheet')[0];if(!sheet)throw Error('Workbook has no sheets.');const relId=sheet.getAttribute('r:id'),rels=parse(files['xl/_rels/workbook.xml.rels']||'');const relationship=[...tags(rels,'Relationship')].find(r=>r.getAttribute('Id')===relId);if(!relationship||relationship.getAttribute('TargetMode')==='External')throw Error('Worksheet relationship is invalid.');
    const target=relationship.getAttribute('Target'),name=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(!files[name])throw Error('First worksheet could not be found.');
    const text=element=>[...tags(element,'t')].map(t=>t.textContent).join(''),strings=files['xl/sharedStrings.xml']?[...tags(parse(files['xl/sharedStrings.xml']),'si')].map(text):[];
    const rows=[];for(const row of tags(parse(files[name]),'row')){const values=[];for(const cell of tags(row,'c')){if(tags(cell,'f').length)throw Error('Formula cells are not allowed in import workbooks. Paste values first.');const reference=cell.getAttribute('r')||'A1',letters=reference.match(/^[A-Z]+/)?.[0];if(!letters)throw Error('Invalid cell reference.');let index=0;for(const c of letters)index=index*26+c.charCodeAt(0)-64;index--;if(index>100)throw Error('Too many worksheet columns.');const type=cell.getAttribute('t'),value=tags(cell,'v')[0]?.textContent||'';values[index]=type==='inlineStr'?text(cell):type==='s'?(strings[+value]??''):value;}if(values.some(v=>String(v||'').trim()))rows.push(Array.from({length:values.length},(_,i)=>values[i]??''));if(rows.length>5000)throw Error('Maximum 5,000 rows per demo import.');}return rows;
  };
})();
